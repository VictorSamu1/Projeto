using System.Text.Json;
using System.Globalization;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors();
builder.Services.AddHttpClient();

var app = builder.Build();
app.UseCors(x => x.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

// =================================================================
// ROTA 1: BUSCAR ENDEREÇO (Para mudar de cidade/bairro em Minas)
// =================================================================
app.MapGet("/api/buscar-endereco", async (string endereco, HttpClient http, IConfiguration config) => {
    var apiKey = config["TomTomApiKey"];
    
    // Força a busca dentro do Brasil
    var url = $"https://api.tomtom.com/search/2/geocode/{Uri.EscapeDataString(endereco)}.json?key={apiKey}&countrySet=BR&limit=1";
    
    try {
        var response = await http.GetAsync(url);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        if (doc.RootElement.TryGetProperty("results", out var res) && res.GetArrayLength() > 0) {
            var local = res[0];
            return Results.Ok(new {
                Lat = local.GetProperty("position").GetProperty("lat").GetDouble(),
                Lng = local.GetProperty("position").GetProperty("lon").GetDouble(),
                NomeFormatado = local.GetProperty("address").GetProperty("freeformAddress").GetString()
            });
        }
        return Results.NotFound();
    } catch { return Results.Problem("Erro ao contactar a TomTom."); }
});

// =================================================================
// ROTA 2: BUSCAR LOJAS/POIs (Usando a coordenada atual do usuário)
// =================================================================
app.MapGet("/api/buscar-lojas", async (string termo, double lat, double lng, HttpClient http, IConfiguration config) => {
    var apiKey = config["TomTomApiKey"];
    
    // A Caixa Forte de Minas Gerais (TopLeft e BottomRight)
    string viewbox = "-14.23,-51.10,-22.92,-39.85"; 

    var url = $"https://api.tomtom.com/search/2/search/{Uri.EscapeDataString(termo)}.json?key={apiKey}&lat={lat.ToString(CultureInfo.InvariantCulture)}&lon={lng.ToString(CultureInfo.InvariantCulture)}&viewbox={viewbox}&limit=15";
    
    try {
        var response = await http.GetAsync(url);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        
        var resultados = new List<object>();
        if (doc.RootElement.TryGetProperty("results", out var items)) {
            foreach (var item in items.EnumerateArray()) {
                resultados.Add(new {
                    Nome = item.TryGetProperty("poi", out var p) && p.TryGetProperty("name", out var n) ? n.GetString() : termo.ToUpper(),
                    Lat = item.GetProperty("position").GetProperty("lat").GetDouble(),
                    Lng = item.GetProperty("position").GetProperty("lon").GetDouble(),
                    Distancia = item.TryGetProperty("dist", out var d) ? d.GetDouble() / 1000.0 : 0,
                    Endereco = item.GetProperty("address").GetProperty("freeformAddress").GetString()
                });
            }
        }
        return Results.Ok(resultados.OrderBy(r => (double)r.GetType().GetProperty("Distancia")!.GetValue(r)!).ToList());
    } catch { return Results.Ok(new object[0]); }
});

app.Run();