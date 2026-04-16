using System.Text.Json;
using System.Text;
using System.Globalization;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors();
builder.Services.AddHttpClient();

var app = builder.Build();
app.UseCors(x => x.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

// =========================================================
// MATEMÁTICA: Distância Real
// =========================================================
double CalcularDistancia(double lat1, double lon1, double lat2, double lon2) {
    var R = 6371; 
    var dLat = (lat2 - lat1) * Math.PI / 180.0;
    var dLon = (lon2 - lon1) * Math.PI / 180.0;
    var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0) *
            Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
    var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    return R * c; 
}

app.MapGet("/api/buscar", async (string termo, double lat, double lng, HttpClient http, IConfiguration config) => {
    
    var apiKey = config["GeminiApiKey"];
    if(string.IsNullOrWhiteSpace(termo)) return Results.Ok(new object[0]);

    // =========================================================
    // 1. IA TRADUZ PARA TAGS OFICIAIS DO OPENSTREETMAP
    // =========================================================
    var prompt = $@"O usuário pesquisou por: '{termo}'.
Sua tarefa é traduzir isso para UMA tag oficial do OpenStreetMap.
Exemplos de tags do OSM:
- Padaria, pão -> shop=bakery
- Farmácia, remédio -> amenity=pharmacy
- Supermercado -> shop=supermarket
- Restaurante -> amenity=restaurant
- Bar, pub -> amenity=bar
- Mecânico -> shop=car_repair
- Chaveiro -> craft=key_cutter
Responda APENAS com a chave e o valor no formato chave=valor (ex: shop=bakery). Se não souber, use shop=supermarket.";

    var requestBody = new { contents = new[] { new { parts = new[] { new { text = prompt } } } } };
    var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
    
    string tagOSM = "shop=supermarket"; // Fallback seguro
    try {
        var responseIA = await http.PostAsync($"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}", content);
        var jsonIA = await responseIA.Content.ReadAsStringAsync();
        using var jsonDoc = JsonDocument.Parse(jsonIA);
        tagOSM = jsonDoc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString()!.Trim();
    } catch { }

    Console.WriteLine($"[Scanner Overpass] Usuário quer: '{termo}' -> Tag Mapeada: '{tagOSM}'");

    // =========================================================
    // 2. O SCANNER OVERPASS (Raio de 30km do GPS)
    // =========================================================
    var partesTag = tagOSM.Split('=');
    if (partesTag.Length != 2) return Results.Ok(new object[0]);
    
    string chave = partesTag[0].Trim();
    string valor = partesTag[1].Trim();
    
    string latStr = lat.ToString(CultureInfo.InvariantCulture);
    string lonStr = lng.ToString(CultureInfo.InvariantCulture);
    
    // Comando QL do Overpass: "Busque nós (nodes) num raio de 30.000 metros (30km) do usuário que tenham essa exata tag"
    string queryOverpass = $@"[out:json][timeout:25];
        (
          node[""{chave}""=""{valor}""](around:30000,{latStr},{lonStr});
        );
        out body;
        >;
        out skel qt;";

    var urlOverpass = "https://overpass-api.de/api/interpreter";
    var requestScanner = new HttpRequestMessage(HttpMethod.Post, urlOverpass);
    requestScanner.Content = new StringContent(queryOverpass, Encoding.UTF8, "application/x-www-form-urlencoded");
    
    var resultadosFiltrados = new List<object>();

    try {
        var responseScanner = await http.SendAsync(requestScanner);
        var jsonScanner = await responseScanner.Content.ReadAsStringAsync();
        using var scanDoc = JsonDocument.Parse(jsonScanner);
        
        var elements = scanDoc.RootElement.GetProperty("elements").EnumerateArray();
        
        foreach (var lugar in elements) {
            // Nem toda loja tem nome cadastrado. Se não tiver, chamamos pelo termo.
            string nomeLoja = lugar.TryGetProperty("tags", out var tags) && tags.TryGetProperty("name", out var nameProp) 
                              ? nameProp.GetString()! 
                              : termo.ToUpper() + " (Local Sem Nome)";

            double lojaLat = lugar.GetProperty("lat").GetDouble();
            double lojaLon = lugar.GetProperty("lon").GetDouble();
            double distanciaKm = CalcularDistancia(lat, lng, lojaLat, lojaLon);

            resultadosFiltrados.Add(new {
                Id = lugar.GetProperty("id").GetInt64(),
                Nome = nomeLoja,
                Lat = lojaLat,
                Lng = lojaLon,
                Descricao = $"Categoria OSM: {tagOSM}",
                Distancia = distanciaKm 
            });
        }
    } catch (Exception ex) { 
        Console.WriteLine($"Erro no Scanner: {ex.Message}");
    }

    // 3. ORDENA E DEVOLVE
    var listaFinal = resultadosFiltrados
        .OrderBy(r => (double)r.GetType().GetProperty("Distancia")!.GetValue(r)!)
        .Take(30) // Pega as 30 mais próximas
        .ToList();

    return Results.Ok(listaFinal);
});

app.Run();