using System.ServiceModel.Syndication;
using System.Xml;
using System.Xml.Linq;
using System.Text.RegularExpressions;

public static class Noticias
{
    // A função se chama RegistrarMinas, para conectar perfeitamente com o Program.cs
    public static void RegistrarMinas(this IEndpointRouteBuilder routes)
    {
        routes.MapGet("/api/feed-noticias", async (HttpClient http) =>
        {
            string url = "https://g1.globo.com/dynamo/mg/minas-gerais/rss2.xml";

            try
            {
                // Sem User-Agent o G1 rejeita a requisição com 403
                http.DefaultRequestHeaders.Clear();
                http.DefaultRequestHeaders.Add("User-Agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36");
                http.DefaultRequestHeaders.Add("Accept",
                    "application/rss+xml, application/xml, text/xml, */*");

                var xmlString = await http.GetStringAsync(url);

                // Lê o RSS em memória (mais seguro que XmlReader.Create(url) direto)
                using var stringReader = new StringReader(xmlString);
                using var xmlReader = XmlReader.Create(stringReader);
                var feed = SyndicationFeed.Load(xmlReader);

                var noticias = feed.Items.Take(9).Select(item =>
                {
                    // Tenta extrair a imagem do campo <media:content> ou <enclosure>
                    string capa = "";

                    // Tenta via Links do item
                    var mediaUrl = item.ElementExtensions
                        .Select(e => {
                            try {
                                var el = e.GetObject<System.Xml.Linq.XElement>();
                                if (el.Name.LocalName == "content" || el.Name.LocalName == "thumbnail")
                                    return el.Attribute("url")?.Value ?? "";
                                return "";
                            } catch { return ""; }
                        })
                        .FirstOrDefault(u => !string.IsNullOrEmpty(u));

                    if (!string.IsNullOrEmpty(mediaUrl))
                        capa = mediaUrl;

                    // Fallback: tenta extrair img do summary HTML
                    if (string.IsNullOrEmpty(capa) && item.Summary != null)
                    {
                        var match = Regex.Match(item.Summary.Text, @"<img[^>]+src=[""']([^""']+)[""']");
                        if (match.Success) capa = match.Groups[1].Value;
                    }

                    // Limpa HTML do resumo
                    string resumoLimpo = item.Summary != null
                        ? Regex.Replace(item.Summary.Text, "<.*?>", "").Trim()
                        : "Sem resumo disponível";

                    // Link da notícia original
                    string link = item.Links.FirstOrDefault()?.Uri?.ToString() ?? "#";

                    return new {
                        capa,
                        manchete = item.Title.Text,
                        resumo = resumoLimpo,
                        link,
                        publicado = item.PublishDate.ToLocalTime().ToString("dd/MM/yyyy HH:mm")
                    };
                });

                return Results.Ok(noticias);
            }
            catch (Exception ex)
            {
                return Results.Problem("Erro ao buscar G1: " + ex.Message);
            }
        });
    }
}