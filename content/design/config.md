---
title: ebt-config
description: Configure EBT-Site for new repository
detail: Sat Jul 22 06:15:52 AM PDT 2023
img: faizan-saeed-PPeZwFWnWNE-unsplash.png
img-alt: Hummingbird reaching to drink nectar from flowers
link: https://unsplash.com/photos/PPeZwFWnWNE 
category: 1. General
order: 2
---

### Customize content

Before you can view your website, you'll need to configure it.
Github allows you to change your website 
[online](https://docs.github.com/en/repositories/working-with-files/managing-files/editing-files).
Just open your browser and login to Github.

To customize your website, you'll need to edit the ```ebt-config.mjs``` 
file in your repository.
Once you configure your website properly, you'll be able to view 
it and add your own wiki content.

### ebt-config.mjs

The file ```ebt-config.mjs``` has several properties you will need to change.
Be sure to use [JSON syntax](https://www.json.org/json-en.html) properly!

#### Required properties:

You must chnage the following properties to get your 
new EBT-Site working.

| Property | Description |
| :---- | :---- |
| appName | The site name (e.g., ```SC-Voice```). for the page header
| basePath | This is The URL base path for your site. Change it to ```/REPOSITORY/```, where REPOSITORY is the Github repository name (e.g., "/my_github_repo/").
| github.account | The Github account name (e.g., "my_github_account") 
| github.repository | The Github repository name (e.g., "my_github_repo") 

#### Custom domain names:

Once you get your EBT-Site running, you'll notice that the URL
is rather large and cumbersome. Indeed, it feels more like a
Github website rather than "MyEbtSite".

With a custom domain name such as "dhammaregent.net", your
URL simplifes to something like 
[https://dhamaregen.net](https://dhammaregen.net/).

First read the Github documentation on 
[Custom Domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

After you've configured your Github repository for a custom domain name,
you also need to change the ```basePath``` property.

| Property | Description |
| :---- | :---- |
| basePath | For a custom domain, change basePath to "/".

#### Optional properties:

Once you've gotten your EBT-Site working, you might be interested 
in customizing it further.
EBT-Sites are multi-lingual by default.
If you have a lot of wiki content, you might want to
make your site monolingual.
The [Dhammaregen](https://dhammaregen.net) maintained by Ayya Sabbamitta
is monolingual, and all the wiki pages are in German.

To create a monolingual website, just edit your ```ebt-config.json``` 
file and change the```monolingual``` property to a specific language.
Be sure to use the two-letter language ISO code (e.g., 'de').

| Property | Description |
| :---- | :---- |
| monolingual | (Optional) The default is ```false```, which allows language selection. If a two-letter language ISO code is specified (e.g., "de"), the users to your site will not have settings to change the web application language or the EBT translation language. The website will be rendered in the language specified.

Monolinqual websites have simpler options in Settings.

As a refinement, you may be interested in changing the
default names for things like the names of "toc" wiki links
or your languages name for "footnotes", etc.

| Property | Description |
| :---- | :---- |
| content.index | (Optional) The file name for customizing the file name used for category table of contents. The default is "toc".
| footnotes | Title of footnote block or blank
| privacyPath | URL for privacy page (default is ```#/wiki/privacy```)

Commit your changes and verify them by viewing your website.

