var builder = WebApplication.CreateBuilder(args);

// Adiciona permissão para o HTML acessar a API
builder.Services.AddCors();

var app = builder.Build();

// Ativa o CORS para todas as origens
app.UseCors(x => x.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

// Rota que devolve as lojas
app.MapGet("/api/lojas", () => {
    return new[] {
        new { Id = 1, Nome = "Loja de Queijos do Serro", Lat = -19.9208, Lng = -43.9378, Categoria = "queijo", Descricao = "O legítimo queijo mineiro." },
        new { Id = 2, Nome = "Cervejaria Uai", Lat = -19.9250, Lng = -43.9400, Categoria = "cervejaria", Descricao = "Cerveja artesanal gelada." },
        new { Id = 3, Nome = "Artesanato Ouro Preto", Lat = -19.9386, Lng = -43.9342, Categoria = "artesanato", Descricao = "Lembranças históricas de Minas." }
    };
});

app.Run();