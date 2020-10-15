# Dejapaw #

![Logo](/images/icon.png)

Dejapaw is a chrome extension, setup a target fields list first, go to web page, and then scrap data one by one.

## install ##

### Deveoper Mode ###

1. Download or fetch this repo.
2. Open `chrome://extensions` page in chrome.
3. Turn `Deveoper Mode` on.
4. Use `Load Unpacked` button (select whole folder).

### Web Store ###

Todo

## Usage ##

Right click extension icon, go to options page.

Setup your fields list.

4 types field means 4 different way do scrap data.

1. string: Select Text By Mouse
2. image: Right Click Image
3. number: Select Number By Mouse
4. clipboard: Press Ctrl/Cmd + v"

set a Webhook you will use it to collecte scraped data.

Go to the web page you want to scrap.

Left Click extension icon, a popup will apear.
Red border input show the current scrap field, do scrap action follow the prompt in placeholder.
Fill all filed, you can send a POST request to Webhook url you saved before.


## Tech List ##

1. [Chrome Extensions](https://developer.chrome.com/extensions)
2. [Preact](https://preactjs.com/)
3. [HTM](https://github.com/developit/htm)

