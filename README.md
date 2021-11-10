# Amazon Scrapper API

Essa API retorna os três primeiros itens das categorias da página de mais vendidos da Amazon.com .
## Endpoints

Essa API possui três endpoints:


* https://tz08inn2pc.execute-api.sa-east-1.amazonaws.com/dev/bestsellers
    * Pesquisa os mais vendidos da Amazon.com, guarda o resultado no Dynamodb e retorna o resultado da busca para a API.


* https://tz08inn2pc.execute-api.sa-east-1.amazonaws.com/dev/bestsellers/{itemId}
    * Pesquisa dentre os itens que já gravados no Dynamodb e retorna o que de itemId igual ao fornecido
    

* https://tz08inn2pc.execute-api.sa-east-1.amazonaws.com/dev/history
    * Retorna todos os itens gravados no Dynamodb

## Estrutura da Response:
```
[
message: S,
    data:[
        itemId: S,
        bestsellers:[
            categoria:S,
            nomes:[]
        ]
    ]   
] 
```
