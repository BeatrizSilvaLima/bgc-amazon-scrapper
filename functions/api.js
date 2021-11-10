const db = require("./db");
const { v4: uuidv4 } = require('uuid');
const chromium = require('chrome-aws-lambda');
//var dayjs = require('dayjs');
//const { addExtra } = require('puppeteer-extra');
//const puppeteerExtra = addExtra(chromium.puppeteer);
const puppeteer = require('puppeteer-core');
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
            Key: marshall({ itemId: event.pathParameters.itemId }),
        };
        const { Item } = await db.send(new GetItemCommand(params));

        console.log({ Item });
        response.body = JSON.stringify({
            message: "Successfully retrieved best sellers.",
            data: (Item) ? unmarshall(Item) : {},
        });
    } catch (e) {
        console.error(e);
        response.statusCode = 500;
        response.body = JSON.stringify({
            message: "Failed to get best sellers.",
            errorMsg: e.message,
            errorStack: e.stack,
        });
    }

    return response;
};

const getNewBestsellers = async (event) => {
    const response = { statusCode: 200 };

    try {

        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath,
            headless: true,
            defaultViewport: null,
          });

        
        const page = await browser.newPage();

        await page.goto('https://www.amazon.com.br/');
        
        let html = await page.evaluate(() => {
            let urls = []; 
            document.querySelectorAll("#nav-xshop>a").forEach(url =>( url.innerHTML.toString().includes("Mais Vendidos") ? urls.push(url.getAttribute('href')) : null) )
            return urls});
        
        
        await page.goto('https://www.amazon.com.br/' + html[0]);
                 
        let bestsellers = await page.evaluate(() => {
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

        let data = {bestsellers:bestsellers,
                    itemId:uuidv4()
        };
        

        await browser.close();
        
        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Item: marshall(data || {}),
        };

        const createResult = await db.send(new PutItemCommand(params));

        response.body = JSON.stringify({
            message: "Successfully retrieved and saved new best sellers.",
            data,
        });
    } catch (e) {
        console.error(e);
        response.statusCode = 500;
        response.body = JSON.stringify({
            message: "Failed to retrieved new best sellers.",
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
            message: "Successfully retrieved all saved best sellers.",
            data: Items.map((item) => unmarshall(item)),
        });
    } catch (e) {
        console.error(e);
        response.statusCode = 500;
        response.body = JSON.stringify({
            message: "Failed to retrieve all saved best sellers.",
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