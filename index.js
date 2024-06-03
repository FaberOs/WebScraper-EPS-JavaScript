const { Builder, By, until } = require("selenium-webdriver");
const edge = require("selenium-webdriver/edge");
const axios = require("axios");
const fs = require("fs");
const https = require("https");
const ac = require("@antiadmin/anticaptchaofficial");

ac.setAPIKey("7a7cc7e7d44f7c6139028cbfacc4f900");

const API_KEY = "5c19ecd4c4c6bbb9c8633fd450f76f66";
const URL = "https://www.adres.gov.co/consulte-su-eps";

async function scrapeEPS() {
  // Configurar el WebDriver de Edge
  const options = new edge.Options();

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
    console.log("Waiting for the iframe to appear");
    await driver.wait(until.elementLocated(By.tagName("iframe")), 10000);

    // Cambiar al iframe
    const iframeElement = await driver.findElement(By.tagName("iframe"));
    await driver.switchTo().frame(iframeElement);

    // Esperar a que aparezcan los elementos del formulario
    console.log("Waiting for the tipoDoc dropdown");
    await driver.wait(until.elementLocated(By.id("tipoDoc")), 10000);

    // Seleccionar el tipo de documento
    console.log("Selecting tipoDoc");
    const tipoDocDropdown = await driver.findElement(By.id("tipoDoc"));
    await tipoDocDropdown.click(); // Hacer clic para abrir el menú desplegable
    await driver.wait(until.elementLocated(By.css('option[value="CC"]')), 5000); // Esperar a que aparezca la opción CC
    const optionCC = await tipoDocDropdown.findElement(
      By.css('option[value="CC"]')
    ); // Seleccionar la opción CC
    await optionCC.click();

    // Ingresar el número de documento
    console.log("Entering numDoc");
    const numDocInput = await driver.findElement(By.id("txtNumDoc"));
    await numDocInput.sendKeys("1006417460");

    // Obtener la URL de la imagen del captcha
    console.log("Getting captcha image URL");
    const captchaImage = await driver.findElement(
      By.id("Capcha_CaptchaImageUP")
    );
    const captchaSrc = await captchaImage.getAttribute("src");

    // Configurar Axios para ignorar la verificación del certificado SSL
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });

    // Descargar la imagen del captcha usando axios
    console.log("Downloading captcha image");
    const captchaResponse = await axios({
      url: captchaSrc,
      responseType: "arraybuffer",
      httpsAgent: agent,
    });
    fs.writeFileSync("captcha.png", captchaResponse.data);
    console.log("Captcha image downloaded as captcha.png");

    // Resolver captcha
    const captcha = fs.readFileSync("captcha.png", { encoding: "base64" });
    const text = await ac.solveImage(captcha, true);

    // Ingresar el código captcha
    console.log("Entering captcha code");
    const captchaInput = await driver.findElement(
      By.id("Capcha_CaptchaTextBox")
    );
    await captchaInput.sendKeys(text);

    // Hacer clic en el botón de consulta
    console.log("Clicking the consultar button");
    const consultarBtn = await driver.findElement(By.id("btnConsultar"));
    await consultarBtn.click();

    // Esperar a que se abra una nueva pestaña con los resultados
    await driver.sleep(3000); // Esperar un poco para asegurarnos de que la nueva pestaña se haya abierto correctamente
    const handles = await driver.getAllWindowHandles();
    await driver.switchTo().window(handles[1]); // Cambiar al manejador de la nueva pestaña

    // Esperar a que se cargue la nueva página de resultados
    await driver.sleep(5000); // Esperar un tiempo suficiente para que se cargue la página (ajustar según sea necesario)

    // Ejecutar JavaScript en la página para guardar como PDF y HTML
    const savePDFScript = `
      const pdfBlob = await fetch(window.location.href, { method: 'GET', credentials: 'include' }).then(response => response.blob());
      const pdfURL = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = pdfURL;
      a.download = 'resultados.pdf';
      a.click();
    `;
    await driver.executeScript(savePDFScript);

    const saveHTMLScript = `
      const htmlContent = document.documentElement.outerHTML;
      return htmlContent;
    `;
    const htmlContent = await driver.executeScript(saveHTMLScript);

    // Guardar el HTML en un archivo
    fs.writeFileSync("page.html", htmlContent);
    console.log("Page saved as HTML");

    console.log("Page saved as PDF and HTML");
    // Procesar resultados (puedes agregar más lógica aquí según sea necesario)
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    // Cerrar el navegador
    await driver.quit();
  }
}

scrapeEPS();
