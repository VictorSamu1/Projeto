<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aqui é Bão Uai - Lojas</title>
    <style>
        /* Estilos Gerais */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: Arial, sans-serif;
        }

        body {
            background-color: #fff;
        }

        /* Header (Vermelho) */
        header {
            background-color: #ff0000;
            color: white;
            padding: 10px 5%;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .logo-area {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .logo-placeholder {
            width: 60px;
            height: 60px;
            background: white;
            border-radius: 5px; /* Simbolizando o logo da imagem */
        }

        nav a {
            color: white;
            text-decoration: none;
            margin: 0 15px;
            font-weight: bold;
            font-size: 1.2rem;
        }

        .search-bar {
            background: #7d7d7d;
            border-radius: 20px;
            padding: 5px 15px;
            display: flex;
            align-items: center;
        }

        .search-bar input {
            background: transparent;
            border: none;
            color: white;
            outline: none;
            padding-left: 10px;
        }

        /* Seção de Título */
        .title-section {
            text-align: center;
            margin: 40px 0;
        }

        .title-section h1 {
            font-size: 2.5rem;
            font-family: serif;
        }

        /* Grid de Lojas */
        .container {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            padding: 20px;
        }

        .card {
            text-align: center;
        }

        .image-container {
            border: 4px solid #ff0000; /* Borda vermelha da imagem */
            overflow: hidden;
            border-radius: 4px;
            aspect-ratio: 16 / 9;
        }

        .image-container img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .card p {
            margin-top: 10px;
            font-size: 1.2rem;
            color: #333;
        }

        /* Rodapé (Vermelho) */
        footer {
            background-color: #ff0000;
            color: white;
            padding: 20px 5%;
            margin-top: 50px;
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: center;
        }

        .contact-info p {
            margin: 5px 0;
            font-size: 0.9rem;
        }

        .social-icons {
            display: flex;
            gap: 15px;
            font-size: 1.5rem;
        }

        /* Responsividade para telas pequenas */
        @media (max-width: 768px) {
            header { flex-direction: column; gap: 15px; }
            footer { flex-direction: column; text-align: center; gap: 20px; }
        }
    </style>
</head>
<body>

    <header>
        <div class="logo-area">
            <div class="logo-placeholder"></div>
            <nav>
                <a href="#">Home</a>
                <a href="#">Mapa</a>
                <a href="#">Notícias</a>
            </nav>
        </div>
        <div class="search-bar">
            <span>🔍</span>
            <input type="text" placeholder="Avenida nossa senhora...">
        </div>
    </header>

    <div class="title-section">
        <h1>lojas</h1>
    </div>

    <main class="container">
        <div class="card">
            <div class="image-container">
                <img src="https://via.placeholder.com/400x225" alt="Interior do Shopping">
            </div>
            <p>Alquimia</p>
        </div>

        <div class="card">
            <div class="image-container">
                <img src="https://via.placeholder.com/400x225" alt="Interior do Shopping">
            </div>
            <p>Urban Roots</p>
        </div>

        <div class="card">
            <div class="image-container">
                <img src="https://via.placeholder.com/400x225" alt="Interior do Shopping">
            </div>
            <p>Zelo</p>
        </div>

        <div class="card">
            <div class="image-container">
                <img src="https://via.placeholder.com/400x225" alt="Interior do Shopping">
            </div>
            <p>Golden Hour</p>
        </div>

        <div class="card">
            <div class="image-container">
                <img src="https://via.placeholder.com/400x225" alt="Interior do Shopping">
            </div>
            <p>Terraço 101</p>
        </div>

        <div class="card">
            <div class="image-container">
                <img src="https://via.placeholder.com/400x225" alt="Interior do Shopping">
            </div>
            <p>Villa dos Sonhos</p>
        </div>
    </main>

    <footer>
        <div class="contact-info">
            <p>contato: (31) 98765-4321</p>
            <p>gmail: E_bão_uai@gmail.com</p>
        </div>
        <div class="creation-date">
            <p>ano de criação: 25/03/2026</p>
        </div>
        <div class="social-icons">
            <span>📸</span> <span>🎥</span> <span>❌</span> <span>🔗</span> <span>📘</span>
        </div>
    </footer>

</body>
</html>