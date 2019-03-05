# Okta + Arkose Labs #

Use Arkose Labs' fraud prevention software to prevent account take-over attempts against your Okta users.

## Prerequisites ##

You'll need an Arkose Labs account and an Okta account. If you don't have an Okta account, you can get a free-forever Okta account at [developer.okta.com](https://developer.okta.com).

This solution is built on NodeJS, so you will need to have NodeJS installed.

## Setup ##

### Set up an authentication policy ###

> Please note that this setup requires you to set up an authentication policy in your Okta tenant that allows authentication only from selected ip addresses. This will ensure that all authentication requests go through your application and the Arkose solution. You can skip this step for dev purposes, but *you must enforce ip-address checking in production with this solution*. See the "Set up an authentication policy" section below for more details, and note that the "Set up an authentication policy" step is different from the "Whitelist your web application domain" step.

### Whitelist your web application domain ###

To get things up and running (for dev or prod), you need to whitelist your web application domain in your Okta tenant.

If you are using the developer console in your Okta tenant, go to `API->Trusted Origins->Add Origin`

If you are using the classic console in your Okta tenant, go to `Security->Trusted Origins->Add Origin`

Click `Trusted Origins` and add the domain of your application.

### Clone the github repo ###

If you haven't already, clone the repo:

### Install NodeJS packages ###
```
npm install
```
### Add your environment variables ###

Copy the `.env_example` file included in this repo to a file called `.env`

Update the values in the `.env` file with your own values. If you don't already have an Okta API token for your tenant, you can follow the instructions [here](https://developer.okta.com/docs/api/getting_started/getting_a_token).

### Launch the application ###

You can now launch the application:

```
node app.js
```

When you enter your credentials and click the `Sign In` button, you will be prompted with an Arkose challenge. When you complete the challenge, you will receive an Okta session token and then be redirected to the same page to start an Okta session.

### Set up an authentication policy ###

To prevent users/requests from going directly to Okta to authenticate, you must set up an authentication policy in your Okta tenant that allows authentication only from selected ip addresses. This will ensure that all authentication requests go through your application and the Arkose solution.

Recommended steps are:

Create a Network Zone "Whitelist zone" that includes the ip address(es) of your application. In the Okta classic console: Security->Networks->Add Zone

Create a group that will store all of your external users: Directory->Groups

Create a policy applied to the External Users group with a rule:

```
IF User's IP is Not in Zone [Whitelist Zone]
THEN Access is Denied
```

Be careful not to include your Okta admin users in this policy.
