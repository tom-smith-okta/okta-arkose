there are several ways to integrate okta with fraud prevention / risk-scoring solutions.

these solutions brwak down into three main categories:

1. bot detectors
2. binary riske scoring
3. risk-scoring with step-up

Most risk scoringsolutions work in a similar fashion: they run javascript on the page, usually continuously. The javascript collects data about the context of the request, like ip address, user agent, etc. The javascript collector sends this data payload to a server.

When a user attempts to authenticate, the authentication form sends either the data payload or a contextToken to the app. The app then sends the payload/token to the fraud server for analysis. The fraud server analyzes the payload along with the server-side data (including data supplied by the app).

Depending on the solution and how it's configured, the fraud solution will return either a binary allow/deny response or a raw score, so the app can decide what to do with the authentication request.

This pattern presents two main challegnes for Okta: 

1) there is no way to "feed" data (such as a context token) into the okta authenticztion flow.

2)  


