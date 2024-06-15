# Script de Scraping para Consultas EPS

Este script automatiza el proceso de consulta de EPS en el sitio web de ADRES usando Selenium WebDriver y Puppeteer. Utiliza ScraperAPI para obtener el HTML de la página dinámica y AntiCaptcha para resolver los desafíos CAPTCHA.

## Requisitos

- Node.js instalado
- NPM (Node Package Manager) instalado
- Microsoft Edge instalado (el WebDriver de Edge debe estar disponible)

## Instalación de Dependencias

Antes de ejecutar el script, asegúrate de instalar las dependencias necesarias ejecutando:

```bash
npm install
```

O en su defecto:

```bash
npm install -r requirements.txt
```

- Asegúrate también de configurar tu clave API de ScrapperAPI y tu clave API de AntiCaptcha en el archivo index.js antes de ejecutar el script.

```js
// Configuración de AntiCaptcha
ac.setAPIKey("YOUR_ANTICAPTCHA_KEY");
```

```js
//Configuración de ScrapperAPI
const API_KEY = "YOUR_SCRAPPERAPI_KEY";
```

## Uso

Para ejecutar el script, utiliza el siguiente comando en la línea de comandos:

```bash
node index.js tipoDoc numDoc
```

Donde:

`tipoDoc` es el tipo de documento (por ejemplo, "CC" para cédula de ciudadanía).
`numDoc` es el número de documento asociado al tipo.

Por ejemplo:

```bash
node index.js CC 123456789
```

Esto iniciará el proceso de scraping y generará un archivo PDF con la consulta realizada.

## Funcionalidad del Script

El script realiza las siguientes acciones:

- Obtiene la página usando ScraperAPI para manejar la renderización de JavaScript.
- Navega al formulario de consulta y completa los campos requeridos (tipo de documento y número de documento).
- Descarga y resuelve el CAPTCHA utilizando AntiCaptcha.
- Realiza la consulta haciendo clic en el botón correspondiente.
- Espera a que se abra una nueva pestaña con los resultados y guarda la página como HTML.
- Utiliza Puppeteer para guardar la página como un archivo PDF.

## Notas

- El script está diseñado para funcionar con la configuración predeterminada de Selenium y Puppeteer. Asegúrate de que el WebDriver de Edge esté correctamente instalado y configurado para su uso.
- El uso de ScraperAPI y AntiCaptcha puede implicar costos adicionales dependiendo del volumen de uso y las tarifas de servicio.
