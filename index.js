const dotenv = require('dotenv')
const express = require('express')
const { Template } = require('@walletpass/pass-js')
const passkit = require('@walletpass/pass-js')
const v4 = require('uuid')
const path = require('path')

// Carrega os dados que salvamos no arquivo .env, como os certificados
dotenv.config();

// Inicializa um template que será usado para criar outros passes
const template = new Template('generic', {
    passTypeIdentifier: "<seu-identificador-de-passe>",
    teamIdentifier: process.env.APPLE_DEVELOPER_TEAM_ID,
    organizationName: "<seu-nome-de-identificacao>",
    description: "<sua-descricao>",
    foregroundColor: "<sua-cor-em-rgb>",
    backgroundColor: "<sua-cor-de-fundo-em-rgb>",
    logoText: "<titulo-da-logo>",
    sharingProhibited: false
  });

// Configura o servidor
const app = express();
const port = process.env.PORT || 8080;
app.use(express.json());


// Inicializa uma lista vazia de passes
const passes = {};

// Aqui configuramos os endpoints, ou os pontos que permitirão a comunicação entre o app e este servidor.

// - Cria um novo passe
app.post('/pass/', async (req, res) => {
    try {

        // Cria um novo passe a partir do template
        const pass = template.createPass({
            serialNumber: v4(),
        });

        // Personalize seu passe aqui
        

        // Salva o passe para ser encontrado mais tarde
        passes[pass.serialNumber] = pass;

        // Envia o passe criado
        res.status(200).type(passkit.constants.PASS_MIME_TYPE).send(await pass.asBuffer());

    } catch (e) {
        // Em caso de erro, envia uma mensagem de erro
        res.status(400).json({
            'message': 'Erro ao criar novo cartão.',
            'error': e.toString()
        })
        console.error(e)
    }

});

// - Retorna um passe existente
app.get('/pass/:uid', async (req, res) => {
    try {
        
        // Tenta encontrar o passe existente pela seu número de série
        const pass = passes[req.params.uid]
        if (pass == null) {
            throw new Error('PassNotFound')
        }

        // Caso encontre, retorna o passe encontrado
        res.status(200).type(passkit.constants.PASS_MIME_TYPE).send(await pass.asBuffer());

    } catch (e) {
        // Em caso de erro, envia uma mensagem de erro
        res.status(400).json({
            'message': 'Erro ao retornar cartão existente.',
            'error': e.toString()
        })
        console.error(e)
    }
});

// Para todos os outros endpoints, o servidor retornará um erro.
app.get('*', (req, res) =>{
    res.status(404).json({
        'message': 'Endpoint não encontrado.',
        'error': 'NotFound'
    });
});


// Configura o template que criamos para usar os certificados
template.setCertificate(Buffer.from(process.env.PASS_CERTIFICATE, 'base64').toString('utf-8')),
template.setPrivateKey(Buffer.from(process.env.PASS_PRIVATE_KEY, 'base64').toString('utf-8'), process.env.PASS_PASSPHRASE)

// Carrega as imagens do nosso template e assim que estiver tudo pronto, inicializa o servidor.
template.images.load(path.join(__dirname, 'images')).then(() => {
    app.listen(port, () => {
        console.log(`O servidor está escutando em http://localhost:${port}`);
    });
})