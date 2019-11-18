WEBtoDOM.js
===========

A javascript function that takes a URL as an argument, fetches the
page from the web, builds a DOM and returns it

This uses TCPSocket API
(https://developer.mozilla.org/en-US/docs/Web/API/TCPSocket).  It is
non-standard and is available on Firefox OS for privileged or
certified applications only.

At this point this does the small tasks I need it to do.

Explicitly I have been using it to download the data from:

http://www.flydunedin.com/cgi/webfids.pl?webfids_type=departures&webfids_passengercargo=passenger&webfids_domesticinternational=both&webfids_airline=ALL

and

http://www.flydunedin.com/cgi/webfids.pl?webfids_type=arrivals&webfids_domesticinternational=both&webfids_passengercargo=passenger&webfids_airline=ALL&webfids_waypoint=ALL

I call WEBtoDOM with a url (one of the two above) as the first
argument and the function to handle the DOM as the second.

The handler function gets one argument, the DOM.  I start processing
by getting all the rows from the document thusly:

var tr = dom.getElementsByTagName("tr");

And fairly simply and obviously from there.

This code uses the HTML Parser By John Resig (ejohn.org) Original code
by Erik Arvidsson, Mozilla Public License
http://erik.eae.net/simplehtmlparser/simplehtmlparser.js

I have extensively rewritten it as I found the original code almost
impossible to follow.

Worik Stanton
Waitati
Ōtepoti
Aotearoa 
2013-10-02
