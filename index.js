const { Builder, By, until } = require("selenium-webdriver");
const edge = require("selenium-webdriver/edge");
const axios = require("axios");
const fs = require("fs");
const https = require("https");
const ac = require("@antiadmin/anticaptchaofficial");
const puppeteer = require("puppeteer");

// Configuración de AntiCaptcha
ac.setAPIKey("YOUR_ANTICAPTCHA_KEY");

// Variables para tipoDoc y numDoc
const tipoDoc = process.argv[2]; // El tipo de documento se pasa como primer argumento
const numDoc = process.argv[3]; // El número de documento se pasa como segundo argumento

if (!tipoDoc || !numDoc) {
  console.error("Debe proporcionar el tipoDoc y numDoc como argumentos.");
  process.exit(1);
}

//Configuración de ScrapperAPI
const API_KEY = "YOUR_SCRAPPERAPI_KEY";
const URL = "https://www.adres.gov.co/consulte-su-eps";

// Función principal para realizar el scraping
async function scrapeEPS() {
  let driver;
  try {
    // Inicializar el WebDriver
    driver = await new Builder()
      .forBrowser("MicrosoftEdge")
      .setEdgeOptions(new edge.Options())
      .build();

    // Obtener la página utilizando ScraperAPI
    const html = await getPageHTML();

    // Navegar y completar el formulario
    await navigateAndFillForm(driver);

    // Resolver el captcha
    await solveCaptcha(driver);

    // Hacer clic en el botón de consulta
    await clickConsultar(driver);

    // Esperar y cambiar a la nueva pestaña
    await switchToNewTab(driver);

    // Guardar la página como HTML
    await saveHTML(driver);

    // Usar Puppeteer para guardar la página como PDF
    await savePDF(driver);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    // Cerrar el navegador
    if (driver) {
      await driver.quit();
    }
  }
}

// Función para obtener el HTML de la página
async function getPageHTML() {
  console.log("Fetching page using ScraperAPI...");
  const response = await axios.get(
    `http://api.scraperapi.com/?api_key=${API_KEY}&url=${URL}&render=true`
  );

  if (response.status !== 200) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  console.log("Página obtenida con éxito");
  return response.data;
}

// Función para navegar y llenar el formulario
async function navigateAndFillForm(driver) {
  await driver.get(URL);

  console.log("Esperando que se genere el IFrame");
  await driver.wait(until.elementLocated(By.tagName("iframe")), 5000);

  const iframeElement = await driver.findElement(By.tagName("iframe"));
  await driver.switchTo().frame(iframeElement);

  console.log("Esperando por el dropdown tipoDoc");
  await driver.wait(until.elementLocated(By.id("tipoDoc")), 5000);

  const tipoDocDropdown = await driver.findElement(By.id("tipoDoc"));
  await tipoDocDropdown.click();
  await driver.wait(
    until.elementLocated(By.css(`option[value="${tipoDoc}"]`)),
    5000
  );
  const option = await tipoDocDropdown.findElement(
    By.css(`option[value="${tipoDoc}"]`)
  );
  await option.click();

  console.log("Ingresando el numDoc");
  const numDocInput = await driver.findElement(By.id("txtNumDoc"));
  await numDocInput.sendKeys(numDoc);
}

// Función para resolver el captcha
async function solveCaptcha(driver) {
  console.log("Obteniendo la URL de la imagen CAPTCHA");
  const captchaImage = await driver.findElement(By.id("Capcha_CaptchaImageUP"));
  const captchaSrc = await captchaImage.getAttribute("src");

  console.log("Descargando imagen CAPTCHA");
  const captchaResponse = await axios({
    url: captchaSrc,
    responseType: "arraybuffer",
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  });
  fs.writeFileSync("captcha.png", captchaResponse.data);
  console.log("Imagen CAPTCHA descargada como: captcha.png");

  const captcha = fs.readFileSync("captcha.png", { encoding: "base64" });
  const text = await ac.solveImage(captcha, true);

  console.log("Ingresando el codigo del CAPTCHA");
  const captchaInput = await driver.findElement(By.id("Capcha_CaptchaTextBox"));
  await captchaInput.sendKeys(text);
}

// Función para hacer clic en el botón 'Consultar'
async function clickConsultar(driver) {
  console.log("Oprimiendo el boton de Consultar");
  const consultarBtn = await driver.findElement(By.id("btnConsultar"));
  await consultarBtn.click();
}

// Función para esperar y cambiar a la nueva pestaña
async function switchToNewTab(driver) {
  await driver.sleep(3000);
  const handles = await driver.getAllWindowHandles();
  await driver.switchTo().window(handles[1]);
  await driver.wait(until.elementLocated(By.tagName("body")), 10000);
}

// Función para guardar la página como HTML
async function saveHTML(driver) {
  const htmlContent = await driver.executeScript(`
    const htmlContent = document.documentElement.outerHTML;
    return htmlContent;
  `);
  fs.writeFileSync("Consulta.html", htmlContent);
  console.log("Consulta guardada como HTML");
}

// Función para guardar la página como PDF utilizando Puppeteer
async function savePDF(driver) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
  );
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
  });

  const cookies = await driver.manage().getCookies();
  const puppeteerCookies = cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expiry,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
  }));
  await page.setCookie(...puppeteerCookies);

  const pageUrl = await driver.getCurrentUrl();
  await page.goto(pageUrl, { waitUntil: "networkidle2" });
  await page.pdf({ path: "Consulta.pdf", format: "A4" });

  await browser.close();
  console.log("Consulta guardada como PDF");
}

// Llamar a la función principal para iniciar el scraping
scrapeEPS();
