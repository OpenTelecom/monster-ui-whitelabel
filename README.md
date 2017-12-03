## Monster UI Whitelabel
With the Whitelabel app you can customize many aspects of the UI, from changing the logo to managing the e-mail 
notification templates. This allows you to effectively apply your own branding and make this product your own.
#### Manual installation (to source files):
1. Upload files from directory `src` to directory with source files of your Monster UI (*near the folders "apps", "css" and "js"*)
2. Register `whitelabel` app
3. Build your Monster UI with original builder (command `gulp`)
4. Activate the Whitelabel app in Monster UI App Store ( `/#/apps/appstore` )

#### Manual installation (to compiled files)
1. Install dependencies
`npm install gulp && npm install gulp-sass && npm install gulp-clean`
2. Run builder
`gulp --gulpfile gulpfile-build-app.js`
3. Upload all folders and files from directory `dist` to root directory of your Monster UI (*near the folders "apps", "css" and "js"*)
4. Register `whitelabel` app
5. Activate the Whitelabel app in Monster UI App Store ( `/#/apps/appstore` )