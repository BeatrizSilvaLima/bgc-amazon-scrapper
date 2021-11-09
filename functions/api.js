const db = require("./db");
const { v4: uuidv4 } = require('uuid');
const chromium = require('chrome-aws-lambda');
var dayjs = require('dayjs');
const { addExtra } = require('puppeteer-extra');
const puppeteerExtra = addExtra(chromium.puppeteer);
const {
    GetItemCommand,
    PutItemCommand,
    DeleteItemCommand,
    ScanCommand,
    UpdateItemCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const getBestsellers = async (event) => {
    const response = { statusCode: 200 };

    try {
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Key: marshall({ postId: event.pathParameters.itemId }),
        };
        const { Item } = await db.send(new GetItemCommand(params));

        console.log({ Item });
        response.body = JSON.stringify({
            message: "Successfully retrieved post.",
            data: (Item) ? unmarshall(Item) : {},
            rawData: Item,
        });
    } catch (e) {
        console.error(e);
        response.statusCode = 500;
        response.body = JSON.stringify({
            message: "Failed to get bestsellers.",
            errorMsg: e.message,
            errorStack: e.stack,
        });
    }

    return response;
};

const getNewBestsellers = async (event) => {
    const response = { statusCode: 200 };

    try {

        const browser = await puppeteerExtra.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath,
            headless: true,
            defaultViewport: null,
          });

        
        const page = await browser.newPage();

        await page.goto('https://www.amazon.com.br/');
        
        let html = await page.evaluate(() => {
            let books = []; 
            document.querySelectorAll("#nav-xshop>a").forEach(book =>( book.innerHTML.toString().includes("Mais Vendidos") ? books.push(book.getAttribute('href')) : null) )
            return books});
        
        
        await page.goto('https://www.amazon.com.br/' + html[0]);
        
        const code =  await page.waitForResponse((response) =>{ return response.status();} )
        
        const title = await page.title();
        
        let teste = await page.evaluate(() => {
            let books = []
            document.querySelectorAll('div[class="a-section a-spacing-large"]').forEach((book)=>{
        
              let nomes = [];
              let categoria;
              book.querySelectorAll('img').forEach(img=>nomes.push(img.getAttribute('alt')));
              categoria = book.querySelector('h2').textContent;
              books.push({categoria:categoria,nomes:nomes});
              nomes = [];
        
            }) 
            return books
        });

        let aux = {bestsellers:teste,
                    itemId:uuidv4(),
                    data:dayjs()
        }
        

        await browser.close();
        

        //const body = JSON.stringify(aux);
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Item: aux,
        };
        const createResult = await db.send(new PutItemCommand(params));

        response.body = JSON.stringify({
            message: "Successfully created post.",
            createResult,
        });
    } catch (e) {
        console.error(e);
        response.statusCode = 500;
        response.body = JSON.stringify({
            message: "Failed to create post.",
            errorMsg: e.message,
            errorStack: e.stack,
        });
    }

    return response;
};

const getHistory = async () => {
    const response = { statusCode: 200 };

    try {
        const { Items } = await db.send(new ScanCommand({ TableName: process.env.DYNAMODB_TABLE_NAME }));

        response.body = JSON.stringify({
            message: "Successfully retrieved all posts.",
            data: Items.map((item) => unmarshall(item)),
            Items,
        });
    } catch (e) {
        console.error(e);
        response.statusCode = 500;
        response.body = JSON.stringify({
            message: "Failed to retrieve posts.",
            errorMsg: e.message,
            errorStack: e.stack,
        });
    }

    return response;
};

module.exports = {
    getBestsellers,
    getNewBestsellers,
    getHistory,

};