const { Builder, By, until } = require("selenium-webdriver");
const edge = require("selenium-webdriver/edge");
const axios = require("axios");
const fs = require("fs");
const https = require("https");
const ac = require("@antiadmin/anticaptchaofficial");
const puppeteer = require("puppeteer");

ac.setAPIKey("7a7cc7e7d44f7c6139028cbfacc4f900");

const API_KEY = "5c19ecd4c4c6bbb9c8633fd450f76f66";
const URL = "https://www.adres.gov.co/consulte-su-eps";

async function scrapeEPS() {
  // Configurar el WebDriver de Edge
  const options = new edge.Options();
  /* options.addArguments("--disable-gpu");
  options.addArguments("--no-sandbox");
  options.addArguments("--disable-dev-shm-usage");
  options.addArguments("--disable-software-rasterizer"); */

  const driver = new Builder()
    .forBrowser("MicrosoftEdge")
    .setEdgeOptions(options)
    .build();

  try {
    console.log("Fetching page using ScraperAPI...");
    const response = await axios.get(
      `http://api.scraperapi.com/?api_key=${API_KEY}&url=${URL}&render=true`
    );

    // Manejar errores de respuesta
    if (response.status !== 200) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const html = response.data;
    console.log("Página obtenida con éxito");

    // Navegar a la URL
    await driver.get(URL);

    // Esperar a que aparezca el iframe
    console.log("Esperando que se genere el IFrame");
    await driver.wait(until.elementLocated(By.tagName("iframe")), 5000);

    // Cambiar al iframe
    const iframeElement = await driver.findElement(By.tagName("iframe"));
    await driver.switchTo().frame(iframeElement);

    // Esperar a que aparezcan los elementos del formulario
    console.log("Esperando por el dropdown tipoDoc");
    await driver.wait(until.elementLocated(By.id("tipoDoc")), 5000);

    // Seleccionar el tipo de documento
    console.log("Seleccionando tipoDoc");
    const tipoDocDropdown = await driver.findElement(By.id("tipoDoc"));
    await tipoDocDropdown.click(); // Hacer clic para abrir el menú desplegable
    await driver.wait(until.elementLocated(By.css('option[value="CC"]')), 5000); // Esperar a que aparezca la opción CC
    const optionCC = await tipoDocDropdown.findElement(
      By.css('option[value="CC"]')
    ); // Seleccionar la opción CC
    await optionCC.click();

    // Ingresar el número de documento
    console.log("Ingresando el numDoc");
    const numDocInput = await driver.findElement(By.id("txtNumDoc"));
    await numDocInput.sendKeys("1006417460");

    // Obtener la URL de la imagen del captcha
    console.log("Obteniendo la URL de la imagen CAPTCHA");
    const captchaImage = await driver.findElement(
      By.id("Capcha_CaptchaImageUP")
    );
    const captchaSrc = await captchaImage.getAttribute("src");

    // Configurar Axios para ignorar la verificación del certificado SSL
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });

    // Descargar la imagen del captcha usando axios
    console.log("Descargando imagen CAPTCHA");
    const captchaResponse = await axios({
      url: captchaSrc,
      responseType: "arraybuffer",
      httpsAgent: agent,
    });
    fs.writeFileSync("captcha.png", captchaResponse.data);
    console.log("Imagen CAPTCHA descargada como: captcha.png");

    // Resolver captcha
    const captcha = fs.readFileSync("captcha.png", { encoding: "base64" });
    const text = await ac.solveImage(captcha, true);

    // Ingresar el código captcha
    console.log("Ingresando el codigo del CAPTCHA");
    const captchaInput = await driver.findElement(
      By.id("Capcha_CaptchaTextBox")
    );
    await captchaInput.sendKeys(text);

    // Hacer clic en el botón de consulta
    console.log("Oprimiendo el boton de Consultar");
    const consultarBtn = await driver.findElement(By.id("btnConsultar"));
    await consultarBtn.click();

    // Esperar a que se abra una nueva pestaña con los resultados
    await driver.sleep(3000); // Esperar un poco para asegurarnos de que la nueva pestaña se haya abierto correctamente
    const handles = await driver.getAllWindowHandles();
    await driver.switchTo().window(handles[1]); // Cambiar al manejador de la nueva pestaña

    // Esperar a que se cargue la nueva página de resultados
    await driver.wait(until.elementLocated(By.tagName("body")), 10000); // Esperar a que se cargue la nueva página

    // Guardar la página como HTML
    const saveHTMLScript = `
      const htmlContent = document.documentElement.outerHTML;
      return htmlContent;
    `;
    const htmlContent = await driver.executeScript(saveHTMLScript);

    // Guardar el HTML en un archivo
    fs.writeFileSync("Consulta.html", htmlContent);
    console.log("Consulta guardad como HTML");

    // Obtener las cookies de la sesión actual
    const cookies = await driver.manage().getCookies();

    // Usar Puppeteer para guardar la página como PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // Agregar encabezados de usuario
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    // Configurar las cookies en Puppeteer
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

    // Navegar a la URL de la página actual
    const pageUrl = await driver.getCurrentUrl();
    await page.goto(pageUrl, { waitUntil: "networkidle2" });
    await page.pdf({ path: "Consulta.pdf", format: "A4" });
    await browser.close();

    console.log("Consulta guardada como PDF");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    // Cerrar el navegador
    await driver.quit();
  }
}

scrapeEPS();
