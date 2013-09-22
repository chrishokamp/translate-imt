var TranslateServer = function() {};

TranslateServer.prototype.formatter = d3.time.format( "%Y-%m-%d %H:%M:%S.%L" );

// Debug settings
//TranslateServer.prototype.SERVER_URL = "http://127.0.0.1:8017/t";
//TranslateServer.prototype.SERVER_URL = "http://joan.stanford.edu:8017/t";
TranslateServer.prototype.SERVER_URL = "http://localhost:8888/cgi-bin/redirect.py";
TranslateServer.prototype.SRC_LANG = "EN";
TranslateServer.prototype.TGT_LANG = "DE";

TranslateServer.prototype.TRANSLATE_LIMIT = 10;
TranslateServer.prototype.WORD_QUERY_LIMIT = 4;

/**
 * Make a word query.
 * @param {string} word Word in the source language.
 * @param {function} f Callback function that takes up to 2 arguments: responseData, requestData.
 **/

TranslateServer.prototype.wordQuery = function( word, callback ) {
	if ( word === undefined ) {
		return [];
	}
	var rqReqData = {
		"src" : this.SRC_LANG,
		"tgt" : this.TGT_LANG,
		"spanLimit" : this.WORD_QUERY_LIMIT,
		"text" : word
	};
	var requestData = {
		"rqReq" : JSON.stringify( rqReqData )
	};
 	var requestTime = new Date();
	var successHandler = function( responseData, responseObject, responseMessage ) {
		var responseTime = new Date();
		var duration = ( responseTime - requestTime ) / 1000;
		var timing = {
			"requestTime" : this.formatter( requestTime ),
			"responseTime" : this.formatter( responseTime ),
			"duration" : duration
		};
		responseData.timing = timing;
		console.log( "[rqReq] [success] [" + duration.toFixed(2) + " seconds]", requestData, responseData, responseObject, responseMessage );
		if ( callback !== undefined ) {
			callback( responseData, requestData );
		}
	}.bind(this);
	var errorHandler = function( responseData, responseObject, responseMessage ) {
		var responseTime = new Date();
		var duration = ( responseTime - requestTime ) / 1000;
		var timing = {
			"requestTime" : this.formatter( requestTime ),
			"responseTime" : this.formatter( responseTime ),
			"duration" : duration
		};
		responseData.timing = timing;
		console.log( "[rqReq] [error] [" + duration.toFixed(2) + " seconds]", requestData, responseData, responseObject, responseMessage );
		if ( callback !== undefined ) {
			callback( responseData, requestData );
		}
	}.bind(this);
	var requestMessage = {
		"url" : this.SERVER_URL,
		"dataType" : "json",
		"data" : requestData,
		"success" : successHandler,
		"error" : errorHandler
	};
	$.ajax( requestMessage );
}

/**
 * Make a translate request.
 * @param {string} sourceText Sentence in source language.
 * @param {string} targetPrefix Partially translated sentence in target language.
 * @param {function} f Callback function that takes up to 3 arguments: translations, responseData, requestData.
 **/
TranslateServer.prototype.translate = function( sourceText, targetPrefix, callback ) {
	if ( sourceText === undefined || sourceText === "" ) {
		if ( callback !== undefined ) {
			callback( [], null, null );
			return;
		}
	}
	if ( targetPrefix === undefined ) {
		targetPrefix = "";
	}

	// Generate tReq data for a HTTP request
	var tReqData = {
		"src" : this.SRC_LANG,
		"tgt" : this.TGT_LANG,
		"n" : this.TRANSLATE_LIMIT,
		"text" : sourceText,
		"tgtPrefix" : targetPrefix,
	};
	var requestData = {
		"tReq" : JSON.stringify( tReqData )
	};

	// Prepare HTTP response handlers
	var requestTime = new Date();
	var successHandler = function( responseData, responseObject, responseMessage ) {
		var responseTime = new Date();
		var duration = ( responseTime - requestTime ) / 1000;
		var timing = {
			"requestTime" : this.formatter( requestTime ),
			"responseTime" : this.formatter( responseTime ),
			"duration" : duration
		};
		responseData.timing = timing;
		var translations = responseData.tgtList;
		console.log( "[tReq] [success] [" + duration.toFixed(2) + " seconds]", translations, requestData, responseData, responseObject, responseMessage );
		if ( callback !== undefined ) {
			callback( translations, requestData, responseData );
		}
	}.bind(this);
	var errorHandler = function( responseData, responseObject, responseMessage ) {
		var responseTime = new Date();
		var duration = ( responseTime - requestTime ) / 1000;
		var timing = {
			"requestTime" : this.formatter( requestTime ),
			"responseTime" : this.formatter( responseTime ),
			"duration" : duration
		};
		responseData.timing = timing;
		console.log( "[tReq] [error] [" + duration.toFixed(2) + " seconds]", null, requestData, responseData, responseObject, responseMessage );
		if ( callback !== undefined ) {
			callback( null, requestData, responseData );
		}
	}.bind(this);
	
	// Send the request
	var requestMessage = {
		"url" : this.SERVER_URL,
		"dataType" : "json",
		"data" : requestData,
		"success" : successHandler,
		"error" : errorHandler
	};
	$.ajax( requestMessage );
};
