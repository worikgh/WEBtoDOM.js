/*

  * Javascript code that implements WEBtoDOM(url, handler).  This uses
  * the url to get a webpage identified by 'url', build a DOM based on
  * it (using HTMLtoDOM) then call 'handler' with it.  

  * This uses TCPSocket API
  * (https://developer.mozilla.org/en-US/docs/Web/API/TCPSocket).  It
  * is non-standard and is available on Firefox OS for privileged or
  * certified applications only.  


 * HTML Parser By John Resig (ejohn.org)
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 * 
 * Adapted by Worik Stanton (worik.stanton@gmail.com) with the
 * aditional TCPSocket code.
 *
 * // Use like so:
 * HTMLParser(htmlString, {
 *     start: function(tag, attrs, unary) {},
 *     end: function(tag) {},
 *     chars: function(text) {},
 *     comment: function(text) {}
 * });
 *
 * // or to get an XML DOM Document
 * HTMLtoDOM(htmlString);
 *
 * // or to inject into an existing document/DOM node
 * HTMLtoDOM(htmlString, document);
 * HTMLtoDOM(htmlString, document.body);
 *
 */

(function(){

    // Regular Expressions for parsing tags and attributes
    var startTag = /^<([-A-Za-z0-9_]+)((?:\s+[\w\-]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
    endTag = /^<\/([-A-Za-z0-9_]+)[^>]*>/,
    attr = /([-A-Za-z0-9_]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g;
    
    // Empty Elements - HTML 4.01
    var empty = makeMap("area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed");

    // Block Elements - HTML 4.01
    var block = makeMap("address,applet,blockquote,button,center,dd,del,dir,div,dl,dt,fieldset,form,frameset,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,p,pre,script,table,tbody,td,tfoot,th,thead,tr,ul");

    // Inline Elements - HTML 4.01
    var inline = makeMap("a,abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var");

    // Elements that you can, intentionally, leave open
    // (and which close themselves)
    var closeSelf = makeMap("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr");

    // Attributes that have their values filled in disabled="disabled"
    var fillAttrs = makeMap("checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected");

    // Special Elements (can contain anything)
    var special = makeMap("script,style");

    var HTMLParser = this.HTMLParser = function( html, handler ) {
	var index, chars, match, stack = [], last = html;
	stack.last = function(){
	    return this[ this.length - 1 ];
	};

	// while ( html) {

	// Strip out new lines and such crap
	nlCrapRegExp = new RegExp("[\n\r\u2028\u2029]", "g");
	html = html.replace(nlCrapRegExp,"");
	while ( html.length> 1 ) {
	    chars = true;

	    // Make sure we're not in a script or style element
	    if ( !stack.last() || !special[ stack.last() ] ) {

		// Comment
		if ( html.indexOf("<!--") == 0 ) {
		    index = html.indexOf("-->");
		    
		    if ( index >= 0 ) {
			if ( handler.comment )
			    handler.comment( html.substring( 4, index ) );
			html = html.substring( index + 3 );
			chars = false;
		    }
		    
		    // end tag
		} else if ( html.indexOf("</") == 0 ) {
		    match = html.match( endTag );
		    
		    if ( match ) {
			html = html.substring( match[0].length );
			match[0].replace( endTag, parseEndTag );
			chars = false;
		    }
		    // start tag
		} else if ( html.indexOf("<") == 0 ) {
		    match = html.match( startTag );



		    if ( match ) {
			html = html.substring( match[0].length );
			match[0].replace( startTag, parseStartTag );
			chars = false; //WTS Why?
		    }else {
			console.log("Here: Failed to match startTag '"+
				    startTag+"'");
		    }
		}

		if ( chars ) {
		    index = html.indexOf("<");
		    
		    var text = index < 0 ? html : html.substring( 0, index );
		    html = index < 0 ? "" : html.substring( index );
		    
		    if ( handler.chars )
			handler.chars( text );
		}

	    } else {
		// In a special (E.g. a <script> or <style> section
		var tag = stack.last();

		// A regular expression to find the end tag and store
		// all the text till then in $1
		var strX = "(.*?)<\/" + tag + "[^>]*>";
		
		var regExp = new RegExp(strX, "i");
		var foo = regExp.exec(html)[0];
		function f(all, text){
		    // 'all' is the substring matched by regExp
		    // 'text' is the all the text up to the end tag

		    // Remove any comments or CDATA sections
		    text = text.replace(/<!--(.*?)-->/g, "$1")
			.replace(/<!\[CDATA\[(.*?)]]>/g, "$1");
		    
		    if ( handler.chars )
			handler.chars( text );

		    // By returning an empty string we remove the
		    // content and nd tag from the special 
		    return "";
		};
		html = html.replace(regExp, f);

		parseEndTag( "", stack.last() );
	    }

	    if ( html == last )
		throw "Parse Error: " + html;
	    last = html;
	}
	
	// Clean up any remaining tags
	parseEndTag();

	function parseStartTag( tag, tagName, rest, unary ) {

	    // Called if a start tag is encountered.  It is the
	    // function argument to a replace call.  Has side effects
	    // on stack

	    tagName = tagName.toLowerCase();

	    if ( block[ tagName ] ) {
		while ( stack.last() && inline[ stack.last() ] ) {
		    parseEndTag( "", stack.last() );
		}
	    }

	    if ( closeSelf[ tagName ] && stack.last() == tagName ) {
		parseEndTag( "", tagName );
	    }

	    unary = empty[ tagName ] || !!unary;

	    if ( !unary )
		stack.push( tagName );
	    
	    if ( handler.start ) {
		var attrs = [];
		
		rest.replace(attr, function(match, name) {
		    var value = arguments[2] ? arguments[2] :
			arguments[3] ? arguments[3] :
			arguments[4] ? arguments[4] :
			fillAttrs[name] ? name : "";
		    
		    attrs.push({
			name: name,
			value: value,
			escaped: value.replace(/(^|[^\\])"/g, '$1\\\"') //"
		    });
		});
		
		if ( handler.start ) // Unnecessary 
		    handler.start( tagName, attrs, unary );
	    }
	}

	function parseEndTag( tag, tagName ) {

	    // Called if an end tag is encountered as the function
	    // argument to a replace call, for a special (like a
	    // <script> or <style>), for each open inline element in a
	    // block, for elements that can close themselves....  Has
	    // side effects on stack. Calls handler.end
	    // (HTMLParser::end) for all open tags on the stack since
	    // the matching open tag.  The first argument is not used.

	    // If no tag name is provided, clean shop.  Causes all
	    // open tags to be closed
	    if ( !tagName )
		var pos = 0;
	    
	    // Find the closest opened tag of the same type
	    else
		for ( var pos = stack.length - 1; pos >= 0; pos-- )
		    if ( stack[ pos ] == tagName )
			break;
	    
	    if ( pos >= 0 ) {
		// Close all the open elements, up the stack
		for ( var i = stack.length - 1; i >= pos; i-- )
		    if ( handler.end )
			handler.end( stack[ i ] );
		
		// Remove the open elements from the stack
		stack.length = pos;
	    }
	}
    };
    
    
    this.HTMLtoDOM = function( html, doc ) {

	// Convert an HTML document into a DOM.  If the 'doc' argument
	// is passed, add the HTML into the doc

	// There can be only one of these elements
	var one = makeMap("html,head,body,title");
	
	// Enforce a structure for the document
	var structure = {
	    link: "head",
	    base: "head"
	};
	
	if ( !doc ) {
	    if ( typeof DOMDocument != "undefined" )
		doc = new DOMDocument();
	    else if ( typeof document != "undefined" && document.implementation && document.implementation.createDocument )
		doc = document.implementation.createDocument("", "", null);
	    else if ( typeof ActiveX != "undefined" )
		doc = new ActiveXObject("Msxml.DOMDocument");
	    
	} else
	    doc = doc.ownerDocument ||
	    doc.getOwnerDocument && doc.getOwnerDocument() ||
	    doc;
	
	var elems = [];
	var documentElement = doc.documentElement ||
	    doc.getDocumentElement && doc.getDocumentElement();
	
	// If we're dealing with an empty document then we
	// need to pre-populate it with the HTML document structure
	if ( !documentElement && doc.createElement ) (function(){
	    var html = doc.createElement("html");
	    var head = doc.createElement("head");
	    head.appendChild( doc.createElement("title") );
	    html.appendChild( head );
	    html.appendChild( doc.createElement("body") );
	    doc.appendChild( html );
	})();
	
	// Find all the unique elements. FIXME: A sanity check here
	// for there being more than one of these elements
	if ( doc.getElementsByTagName )
	    for ( var i in one )
		one[ i ] = doc.getElementsByTagName( i )[0];
	
	// If we're working with a document, inject contents into
	// the body element
	var curParentNode = one.body;
	
	var HTML_Handler = {

	    // HTMLParser::start
	    // This is called via parseStartTag for each (?) start
	    // tag.  It has many side effects: 
	    //  Maintains the curParentNode
	    // Pushes elements that are not unary onto the elems array
	    // Maintains, albeit in a confusing manor, the
	    // ... structure (FIXME: This comment is unfinished)

	    start: function( tagName, attrs, unary ) {
		// console.log("start: " + tagName+ " " +298);

		// If it's a pre-built element, then we can ignore
		// its construction
		if ( one[ tagName ] ) {
		    curParentNode = one[ tagName ];
		    if ( !unary ) {
			elems.push( curParentNode );
		    }
		    return;
		}
		// console.log("Line316 WEBtoDOM: "+tagName);
		var elem = doc.createElement( tagName );
		
		for ( var attr in attrs ){
		    elem.setAttribute( attrs[ attr ].name, 
				       attrs[ attr ].value );
		}
		
		if ( structure[ tagName ] && 
		     typeof one[ structure[ tagName ] ] != "boolean" ){
		    // This will get called for tagName being "link"
		    // or "base" and element named by tagName has been
		    // encountered and put in 'one'
		    one[ structure[ tagName ] ].appendChild( elem );
		}else if ( curParentNode && curParentNode.appendChild )
		    curParentNode.appendChild( elem );
		
		if ( !unary ) {
		    elems.push( elem );
		    curParentNode = elem;
		}
	    },

	    // HTMLParser::end
	    // Called from parseEndTag for each end tag encountered.
	    // It  maintains the curParentNode
	    end: function( tag ) {
		elems.length -= 1;
		
		// Init the new parentNode
		curParentNode = elems[ elems.length - 1 ];
	    },
	    chars: function( text ) {
		if(text.length  == 0){
		    //console.log("here");
		}
		curParentNode.appendChild( doc.createTextNode( text ) );
	    },
	    comment: function( text ) {
		// create comment node
	    }
	};

	HTMLParser( html, HTML_Handler);
	
	return doc;
    };

    function makeMap(str){
	var obj = {}, items = str.split(",");
	for ( var i = 0; i < items.length; i++ )
	    obj[ items[i] ] = true;
	return obj;
    }

    function decode_url(url){
	// http://www.ietf.org/rfc/rfc2396.txt 
	var re = /^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
	/*
	  scheme    = res[2]
	  authority = res[4]
	  path      = res[5]
	  query     = res[7]
	  fragment  = res[9]
	*/

	var res = re.exec(url);
	return(res);
    }
    
    function make_request(url){


	/*
	  rfc2396

	  lowalpha = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" |
          "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" |
          "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z"

	  upalpha  = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" |
          "J" | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" |
          "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z"

	  alpha    = lowalpha | upalpha

	  digit    = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" |
          "8" | "9"

	  alphanum = alpha | digit

	  reserved    = ";" | "/" | "?" | ":" | "@" | "&" | "=" | "+" |
          "$" | ","

	  mark        = "-" | "_" | "." | "!" | "~" | "*" | "'" | "(" | ")"
	  unreserved  = alphanum | mark


	  hex         = digit | "A" | "B" | "C" | "D" | "E" | "F" |
          "a" | "b" | "c" | "d" | "e" | "f"
	  escaped     = "%" hex hex
	  uric          = reserved | unreserved | escaped
	  uric_no_slash = unreserved | escaped | ";" | "?" | ":" | "@" |
          "&" | "=" | "+" | "$" | ","

	  2.4.3. Excluded US-ASCII Characters

	  control     = <US-ASCII coded characters 00-1F and 7F hexadecimal>
	  space       = <US-ASCII coded character 20 hexadecimal>
	  delims      = "<" | ">" | "#" | "%" | <">
	  unwise      = "{" | "}" | "|" | "\" | "^" | "[" | "]" | "`"
	  

	  scheme        = alpha *( alpha | digit | "+" | "-" | "." )

	  userinfo      = *( unreserved | escaped |
          ";" | ":" | "&" | "=" | "+" | "$" | "," )
	  hostport      = host [ ":" port ]
	  host          = hostname | IPv4address
	  hostname      = *( domainlabel "." ) toplabel [ "." ]
	  domainlabel   = alphanum | alphanum *( alphanum | "-" ) alphanum
	  toplabel      = alpha | alpha *( alphanum | "-" ) alphanum

	  server        = [ [ userinfo "@" ] hostport ]
	  reg_name      = 1*( unreserved | escaped | "$" | "," |
          ";" | ":" | "@" | "&" | "=" | "+" )
	  authority     = server | reg_name
	  pchar         = unreserved | escaped |
          ":" | "@" | "&" | "=" | "+" | "$" | ","
	  param         = *pchar
	  segment       = *pchar *( ";" param )
	  path_segments = segment *( "/" segment )


	  abs_path      = "/"  path_segments
	  opaque_part   = uric_no_slash *uric
	  path          = [ abs_path | opaque_part ]

	  query         = *uric
	  Within a query component, the characters ";", "/", "?", ":", "@",
	  "&", "=", "+", ",", and "$" are reserved.

	  Generic URI:   <scheme>://<authority><path>?<query>

	  Examples:

	  GET http://www.w3.org/pub/WWW/TheProject.html HTTP/1.1

	  GET /pub/WWW/TheProject.html HTTP/1.1
	  Host: www.w3.org   

	*/

	/*
	  rfc2616
	  
	  http_URL = "http:" "//" host [ ":" port ] [ abs_path [ "?" query ]]
	  If no port, assume 80

	  If the abs_path is not present in the URL, it MUST be given as "/"
	  when used as a Request-URI for a resourcex 

	  OCTET          = <any 8-bit sequence of data>
	  CHAR           = <any US-ASCII character (octets 0 - 127)>
	  UPALPHA        = <any US-ASCII uppercase letter "A".."Z">
	  LOALPHA        = <any US-ASCII lowercase letter "a".."z">
	  ALPHA          = UPALPHA | LOALPHA
	  DIGIT          = <any US-ASCII digit "0".."9">
	  CTL            = <any US-ASCII control character
          (octets 0 - 31) and DEL (127)>
	  CR             = <US-ASCII CR, carriage return (13)>
	  LF             = <US-ASCII LF, linefeed (10)>
	  SP             = <US-ASCII SP, space (32)>
	  HT             = <US-ASCII HT, horizontal-tab (9)>
	  <">            = <US-ASCII double-quote mark (34)>


          Request       = Request-Line              
          *(( general-header        
          | request-header         
          | entity-header ) CRLF)  
          CRLF
          [ message-body ]          


	  Request-URI    = "*" | absoluteURI | abs_path | authority	
	  Request-Line   = Method SP Request-URI SP HTTP-Version CRLF
	  

	  Method         = "OPTIONS" 
          | "GET"     
          | "HEAD"    
          | "POST"    
          | "PUT"     
          | "DELETE"  
          | "TRACE"   
          | "CONNECT" 
          | extension-method
	  extension-method = token

	*/
	
	/*

	  http_URL = "http:" "//" host [ ":" port ] [ abs_path [ "?" query ]]
	  If no port, assume 80

	*/

	// Match the host and the rest
	var res = decode_url(url);
	/*	
	if(res.length > 1) {
	    for(var i = 1; i < res.length; i++){
		if(res[i] !== undefined){
		    console.log("Result " + i +": " + res[i]);
		}
	    }
	}
	*/
	/*
          Request       = Request-Line              ; Section 5.1
          *(( general-header        ; Section 4.5
          | request-header         ; Section 5.3
          | entity-header ) CRLF)  ; Section 7.1
          CRLF
          [ message-body ]          ; Section 4.3
	*/

	//         Request-Line   = Method SP Request-URI SP HTTP-Version CRLF

	// The RFC says that "The absoluteURI form is REQUIRED when the
	//    request is being made to a proxy..."  so I will use the
	//    absoluteURIvas the Request-URI
	var absoluteURI = res[2] + ":" + "//" + res[4];
	if(res[5] !== undefined){
	    absoluteURI += res[5];
	}
	if(res[7] !== undefined){
	    absoluteURI += '?' + res[7];
	}
	var request_line = 'GET '+ absoluteURI + " HTTP/1.1";

	// General headers:
	var general_headers = "Cache-Control:no-cache";
	var Agent = "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:21.0) Gecko/20100101 Firefox/21.0";
	var request_headers = "Host: " + res[4];+"User-Agent:"+Agent;
	var request = request_line + "\r\n" +  general_headers + "\r\n" +  request_headers + "\r\n" + "\r\n";

	return(request);

    }

    this.WEBtoDOM = function (url, handler){
	// Get a DOM from the URL and pass it to 'handler'
	var res = decode_url(url);

	// Set up the structures to get the data from the website
	
	var _Data = "";  // Data down loaded so far
	var _State = 0;  // The state of the download.  0 for have not got
	// <html> yet, 1 for got <html> but not </html>,
	// 2 for got </html>
	function _onData(e){
	    // Call back for when the data arrives
	    try{
		if(_State == 0){
		    // Look for <html> tag
		    var idx = e.data.indexOf("<html");
		    if(idx == -1){
			return(null);
		    }
		    var html = e.data.substring(idx, e.data.length);
		    idx = html.indexOf("</html>");
		    if(idx != -1){
			html = html.substring(0, idx+7);
			_State = 2;
		    }else{
			_State = 1;
		    }
		    _Data = html;
		}else if(_State == 1){
		    // Look for </html> tag
		    var idx = e.data.indexOf("</html>");
		    if(idx == -1){
			// Not found yet
			_Data = _Data + e.data;
		    }else{
			_Data = _Data + e.data.substring(0, idx+7);
			_State = 2;
		    }
		}
		if(_State == 2){
		    // Got all the data
		    
		    // Build a dom...
		    var dom;

		    dom = HTMLtoDOM(_Data);
		    
		    // Handle the DOM
		    handler(dom);
		    
		}
	    }catch(e){
		console.log("_onData exception: "+e);
	    }
	}

	function onDrain(e){
	    throw("onDrain "+e.type);
	    // Not sure what to do here.  "A handler for the drain event. This
	    // event is triggered each time the buffer of data is flushed."
	}

	function makeOpenHandler(url, request){
	    // Return a function to handle the open event and send a request
	    ret = function(e){
		var socket = e.target;
		// console.log("request: "+request);
		var r = socket.send(request);
		if(r){
		    console.log("Sent request. "+url+"  Safe to send more");
		}else{
		    console.log("Buffered request "+url);
		}	
	    };
	    return(ret);
	}
	function onError(e){
	    throw("onError: "+e.type);
	}

	function onClose(e){
	    console.log("onClose: " + e.type);
	}

	var socket = navigator.mozTCPSocket;
	socket = socket.open(res[4], 80);        

	// Standard handlers that are not CompanieNZ specific
	socket.onopen = makeOpenHandler(res[4], make_request(url));
	socket.ondrain = onDrain;
	socket.onerror = onError;
	socket.onclose = onClose;

	// The ondata handler is CompanieNZ specific
	socket.ondata = _onData;
    }


})();
// //--------------------------------------------------
