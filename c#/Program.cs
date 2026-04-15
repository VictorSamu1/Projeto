using System.Text.Json;
using System.Text;
using System.Globalization;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors();
builder.Services.AddHttpClient();

var app = builder.Build();
app.UseCors(x => x.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

app.MapGet("/api/buscar", async (string termo, double lat, double lng, HttpClient http, IConfiguration config) => {
    
    var apiKey = config["GeminiApiKey"];
    if(string.IsNullOrWhiteSpace(termo)) return Results.Ok(new object[0]);

    // 1. IA EXPANDE OS TERMOS (Padaria, Panificadora, etc)
    var prompt = $@"O usuário pesquisou por: '{termo}'.
Gere EXATAMENTE 3 sinônimos ou termos relacionados para estabelecimentos comerciais.
Exemplo: 'pão' -> 'padaria, panificadora, lanchonete'.
Responda APENAS os termos separados por vírgula.";

    var requestBody = new { contents = new[] { new { parts = new[] { new { text = prompt } } } } };
    var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
    
    string respostaIA = termo;
    try {
        var responseIA = await http.PostAsync($"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}", content);
        var jsonIA = await responseIA.Content.ReadAsStringAsync();
        using var jsonDoc = JsonDocument.Parse(jsonIA);
        respostaIA = jsonDoc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString()!.Trim();
    } catch { }

    var palavrasBusca = respostaIA.Split(',').Select(p => p.Trim()).ToList();
    if (!palavrasBusca.Contains(termo)) palavrasBusca.Add(termo);

    // 2. BUSCA RESTRITA A MINAS GERAIS COM PRIORIDADE LOCAL
    // Coordenadas aproximadas de Minas Gerais (Viewbox: Oeste, Norte, Leste, Sul)
    string viewboxMG = "-51.10,-14.23,-39.85,-22.92"; 
    var resultadosFinais = new Dictionary<long, object>();

    foreach (var palavra in palavrasBusca) {
        // q=palavra + Minas Gerais (para reforçar)
        // viewbox=MG + bounded=1 (trava a busca dentro do estado)
        // lat/lon (dá prioridade ao que está perto de você)
        var urlMapa = $"https://nominatim.openstreetmap.org/search?format=json&q={Uri.EscapeDataString(palavra + " Minas Gerais")}&viewbox={viewboxMG}&bounded=1&lat={lat.ToString(CultureInfo.InvariantCulture)}&lon={lng.ToString(CultureInfo.InvariantCulture)}&limit=20";
        
        var requestMapa = new HttpRequestMessage(HttpMethod.Get, urlMapa);
        requestMapa.Headers.Add("User-Agent", "ProjetoAquiEBaoUai/1.0");

        try {
            var responseMapa = await http.SendAsync(requestMapa);
            var jsonMapa = await responseMapa.Content.ReadAsStringAsync();
            using var mapDoc = JsonDocument.Parse(jsonMapa);
            
            foreach (var lugar in mapDoc.RootElement.EnumerateArray()) {
                long id = lugar.GetProperty("place_id").GetInt64();
                if (!resultadosFinais.ContainsKey(id)) {
                    string nomeCompleto = lugar.GetProperty("display_name").GetString()!;
                    resultadosFinais[id] = new {
                        Id = id,
                        Nome = nomeCompleto.Split(',')[0], 
                        Lat = double.Parse(lugar.GetProperty("lat").GetString()!, CultureInfo.InvariantCulture),
                        Lng = double.Parse(lugar.GetProperty("lon").GetString()!, CultureInfo.InvariantCulture),
                        Descricao = nomeCompleto
                    };
                }
            }
        } catch { }
        await Task.Delay(200); 
    }

    return Results.Ok(resultadosFinais.Values);
});

app.Run();