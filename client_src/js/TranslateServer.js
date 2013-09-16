var TranslateServer = function() {};

TranslateServer.prototype.SERVER_URL = "http://joan.stanford.edu:8017/t";
TranslateServer.prototype.formatter = d3.time.format( "%Y-%m-%d %H:%M:%S.%L" );

/**
 * Make a translate request.
 * @param {function} f Call back function on either a successful or failed request. The arguments for f are: targetTranslation, requestData, responseData.	On failed requests, targetTranslation is null.
 * @param {string} sourceText Sentence in source language.
 * @param {string} targetPrefix Partially translated sentence in target language.
 * @param {{string:object}} options Additional options for the request (src, tgt, n).
 **/
TranslateServer.prototype.translate = function( f, sourceText, targetPrefix, options ) {
	// Default arguments
	if ( f === undefined ) {
		return;
	}
	if ( sourceText === undefined || sourceText.length === 0 ) {
		if ( f !== undefined ) {
			f( "", null, null );
			return;
		}
	}
	if ( targetPrefix === undefined ) {
		targetPrefix = "";
	}
	if ( options === undefined ) {
		options = {};
	}

	// Generate tReq data for a HTTP request
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
		console.log( "[TranslateServer] [success] " + duration.toFixed(2) + " seconds", requestData, responseData, responseObject, responseMessage );
		var targetTranslation = responseData.tgtList[0];
		if ( f !== undefined ) {
			f( targetTranslation, requestData, responseData );
		}
	}.bind(this);
	var errorHandler = function( responseData, responseObject, responseMessage ) {
		var responseTime = new Date();
		var duration = ( responseTime.UTC() - requestTime.UTC() ) / 1000;
		var timing = {
					"requestTime" : this.formatter( requestTime ),
					"responseTime" : this.formatter( responseTime ),
					"duration" : duration
				};
		responseData.timing = timing;
		console.log( "[TranslateServer] [error] " + duration.toFixed(2) + " seconds", requestData, responseData, responseObject, responseMessage );
		if ( f !== undefined ) {
			f( null, requestData, responseData );
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
