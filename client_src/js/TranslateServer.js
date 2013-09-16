var TranslateServer = function() {};

TranslateServer.prototype.SERVER_URL = "http://joan.stanford.edu:8017/t";

/**
 * Make a translate request.
 * @param {string} sourceText Sentence in source language.
 * @param {string} targetPrefix Partially translated sentence in target language.
 * @param {{string:object}} options Additional options for the request (src, tgt, n).
 * @param {function} f Call back function on either a successful or failed request. The arguments for f are: targetTranslation, requestData, responseData.  On failed requests, targetTranslation is null.
 **/
TranslateServer.prototype.translate = function( sourceText, targetPrefix, options, f ) {
	var tReqData = {
		"src" : "EN",
		"tgt" : "DE",
		"n" : 1,
		"text" : sourceText,
		"tgtPrefix" : targetPrefix,
	};
	for ( var key in options ) {
		tReqData[ key ] = options[ key ];
	}
	var requestData = {
		"tReq" : JSON.stringify( tReqData )
	};

	var requestTime = Date.now();
	var successHandler = function( responseData, responseObject, responseMessage ) {
		var responseTime = Date.now();
		var duration = ( responseTime - requestTime ) / 1000;
		console.log( "[TranslateServer] [success] " + duration.toFixed(2) + " seconds", requestData, responseData, responseObject, responseMessage );
		var targetTranslation = data.tgtList[0];
		if ( f !== undefined ) {
			f( targetTranslation, requestData, responseData );
		}
	};
	var errorHandler = function( responseData, responseObject, responseMessage ) {
		var responseTime = Date.now();
		var duration = ( responseTime - requestTime ) / 1000;
		console.log( "[TranslateServer] [error] " + duration.toFixed(2) + " seconds", requestData, responseData, responseObject, responseMessage );
		if ( f !== undefined ) {
			f( null, requestData, responseData );
		}
	};
	var requestMessage = {
		"url" : this.SERVER_URL,
		"dataType" : "json",
		"data" : requestData,
		"success" : successHandler,
		"error" : errorHandler
	};
	$.ajax( requestMessage );
};

