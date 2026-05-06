public static class Noticias
{
    public static void RegistrarMinas(this IEndpointRouteBuilder routes)
    {
        routes.MapGet("/api/noticias-mg", () => {
            return new[] {
                new { 
                    Id = 1, 
                    Titulo = "Reforço na Saúde em Contagem", 
                    Resumo = "Estado decreta emergência por doenças respiratórias.", 
                    UrlImagem = "Imagens noticias/noticia1.avif" 
                },
                new { 
                    Id = 2, 
                    Titulo = "Mineiro brilha em Los Angeles", 
                    Resumo = "Empreendedor da Feira Hippie expande negócios.", 
                    UrlImagem = "Imagens noticias/noticia2.avif" 
                }
            };
        });
    }
}