using System.Text.Json;
using System.Globalization;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors();
builder.Services.AddHttpClient();

var app = builder.Build();
app.UseCors(x => x.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

// =================================================================
// ROTA 1: BUSCAR ENDEREÇO (Mudar de cidade/bairro em Minas)
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
            
            // TRAVA DE SEGURANÇA 1: Evita que o C# quebre se não houver endereço
            string nomeFormatado = endereco;
            if (local.TryGetProperty("address", out var addr) && addr.TryGetProperty("freeformAddress", out var freeform)) {
                nomeFormatado = freeform.GetString() ?? endereco;
            }

            return Results.Ok(new {
                Lat = local.GetProperty("position").GetProperty("lat").GetDouble(),
                Lng = local.GetProperty("position").GetProperty("lon").GetDouble(),
                NomeFormatado = nomeFormatado
            });
        }
        return Results.NotFound();
    } catch (Exception ex) { 
        return Results.Problem($"Erro interno: {ex.Message}"); 
    }
});

// =================================================================
// ROTA 2: BUSCAR LOJAS/POIs (Perto da posição atual do usuário)
// =================================================================
// MUDANÇA: A variável agora é 'lon' igualzinho vem da URL do JavaScript
app.MapGet("/api/buscar-lojas", async (string termo, string lat, string lon, HttpClient http, IConfiguration config) => {
    var apiKey = config["TomTomApiKey"];
    
    // Converte de string para double do jeito certo (ignorando se o PC tá em português)
    if (!double.TryParse(lat, NumberStyles.Any, CultureInfo.InvariantCulture, out double latDouble) ||
        !double.TryParse(lon, NumberStyles.Any, CultureInfo.InvariantCulture, out double lonDouble)) 
    {
        return Results.BadRequest("Coordenadas inválidas");
    }

    // A Caixa Forte de Minas Gerais (TopLeft e BottomRight)
    string viewbox = "-14.23,-51.10,-22.92,-39.85"; 

    var url = $"https://api.tomtom.com/search/2/search/{Uri.EscapeDataString(termo)}.json?key={apiKey}&lat={latDouble.ToString(CultureInfo.InvariantCulture)}&lon={lonDouble.ToString(CultureInfo.InvariantCulture)}&viewbox={viewbox}&limit=15";
    
    try {
        var response = await http.GetAsync(url);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        
        var resultados = new List<object>();
        if (doc.RootElement.TryGetProperty("results", out var items)) {
            foreach (var item in items.EnumerateArray()) {
                
                // TRAVA DE SEGURANÇA 2: Protege contra locais sem nome
                string nomeLocal = termo.ToUpper();
                if (item.TryGetProperty("poi", out var p) && p.TryGetProperty("name", out var n)) {
                    nomeLocal = n.GetString() ?? termo.ToUpper();
                }

                // TRAVA DE SEGURANÇA 3: Protege contra locais sem endereço mapeado
                string enderecoFinal = "Endereço não disponível";
                if (item.TryGetProperty("address", out var addr) && addr.TryGetProperty("freeformAddress", out var freeform)) {
                    enderecoFinal = freeform.GetString() ?? "Endereço não disponível";
                }

                resultados.Add(new {
                    Nome = nomeLocal,
                    Lat = item.GetProperty("position").GetProperty("lat").GetDouble(),
                    Lng = item.GetProperty("position").GetProperty("lon").GetDouble(),
                    Distancia = item.TryGetProperty("dist", out var d) ? d.GetDouble() / 1000.0 : 0,
                    Endereco = enderecoFinal
                });
            }
        }
        return Results.Ok(resultados.OrderBy(r => (double)r.GetType().GetProperty("Distancia")!.GetValue(r)!).ToList());
    } catch (Exception ex) { 
        return Results.Problem($"Erro interno: {ex.Message}"); 
    }
});

app.RegistrarMinas();
app.Run();