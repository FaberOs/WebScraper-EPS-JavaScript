import puppeteer from "puppeteer";
import fetch from "node-fetch";
import anticaptchaoficial from "@antiadmin/anticaptchaofficial";

const API_KEY = "5c19ecd4c4c6bbb9c8633fd450f76f66";
const URL = "https://www.adres.gov.co/consulte-su-eps";
const ANTI_CAPTCHA_KEY = "7a7cc7e7d44f7c6139028cbfacc4f900";

// Configurar AntiCaptcha
anticaptchaoficial.setAPIKey(ANTI_CAPTCHA_KEY);

(async () => {
  // Fetch con ScraperAPI
  try {
    const response = await fetch(
      `http://api.scraperapi.com/?api_key=${API_KEY}&url=${URL}&render=true`
    );
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const html = await response.text();
    console.log("Página obtenida con éxito");

    // Lanzar Puppeteer
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Cargar el HTML obtenido por ScraperAPI
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    // Ingresar datos de identificación

    const selectTipoDoc = await page.waitForSelector("#tipoDoc");
    const inputNumDoc = await page.waitForSelector("#textNumDoc");

    await selectTipoDoc.select("CC"); // Cambiar según el selector del sitio
    await inputNumDoc.type("1006417460"); // Cambiar según el selector del sitio

    // Resolver CAPTCHA
    const captchaImg = await page.$("#Capcha_CaptchaImageUP"); // Cambiar según el selector del sitio
    const captchaSrc = await captchaImg.screenshot({ encoding: "base64" });

    const captchaResult = await resolveCaptcha(captchaSrc);
    await page.type("#Capcha_CaptchaTextBox", captchaResult); // Cambiar según el selector del sitio

    // Hacer clic en el botón de consulta
    await page.click("#btnConsultar"); // Cambiar según el selector del sitio
    await page.waitForNavigation();

    // Guardar la página como PDF
    await page.pdf({ path: "respuesta.pdf", format: "A4" });
    console.log("Respuesta guardada como PDF");

    await browser.close();
  } catch (error) {
    console.error("Error:", error);
  }
})();

async function resolveCaptcha(base64Image) {
  return new Promise((resolve, reject) => {
    anticaptchaoficial.createImageToTextTask(
      {
        case: true,
        body: base64Image,
      },
      function (err, taskId) {
        if (err) return reject(err);

        anticaptchaoficial.getTaskSolution(
          taskId,
          function (err, taskSolution) {
            if (err) return reject(err);

            resolve(taskSolution.text);
          }
        );
      }
    );
  });
}
