var TargetState = Backbone.Model.extend({
	defaults : {
		"segmentId" : null,
		"userText" : "",
		"caretIndex" : 0,
		"prefix" : "",
		"translationList" : [],
		"alignIndexList" : [],
		"chunkIndexList" : [],
		"hasFocus" : null,
							    // Derived states
		"allTokens" : [],
		"caretToken" : null,
		"activeTokens" : [],
		"activeChunkIndex" : null,
		"matchingTranslations" : [],
		"matchedSourceTokens" : {},
		"hadFocus" : null,      // Previous value of hasFocus
		"isChanged" : false,    // User-entered text changed from prefix used to generate the current list of translations
		"isExpired" : false     // Expired if user-entered text differs from prefix or the current best translation
	}
});

TargetState.prototype.WHITESPACE = /([ ]+)/g;

TargetState.prototype.setTranslations = function( prefix, translationList, alignIndexList, chunkIndexList ) {
	this.set({
		"prefix" : prefix,
		"translationList" : translationList,
		"alignIndexList" : alignIndexList,
		"chunkIndexList" : chunkIndexList
	});
	this.__resetTokens();
	this.__updateTokensFromPrefix();
	this.__updateTokensFromBestTranslation();
	this.__updateTokensFromUserText();
	this.__updateCaretToken();
	this.__updateActiveTokens();
	this.__updateMatchedSourceTokens();
	this.__checkForChangedTokens();
	this.__checkForExpiredTokens();
	this.__checkFocus();
	this.trigger( "modified" );
};

TargetState.prototype.setUserText = function( userText, caretIndex ) {
	this.set({
		"userText" : userText,
		"caretIndex" : caretIndex
	});
	this.__updateTokensFromUserText();
	this.__updateCaretToken();
	this.__updateActiveTokens();
	this.__updateMatchedSourceTokens();
	this.__checkForChangedTokens();
	this.__checkForExpiredTokens();
	this.__checkFocus();
	this.trigger( "modified" );
};

TargetState.prototype.setFocus = function( hasFocus ) {
	this.__checkFocus( hasFocus );
	this.trigger( "modified" );
};

TargetState.prototype.__resetTokens = function() {
	this.set({
		"allTokens" : [],
		"isChanged" : false,
		"isExpired" : false
	});
};

TargetState.prototype.__newToken = function() {
	var token = {
		"hasUser" : false,         // Set by __updateTokensFromUserText()
		"userWord" : "",           // Set by __updateTokensFromUserText()
		"userSep" : "",            // Set by __updateTokensFromUserText()
		"prefixWord" : "",         // Set by __updateTokensFromPrefix()
		"translationWord" : "",    // Set by __updateTokensFromBestTranslation()
		"sourceTokenIndexes" : [], // Set by __updateTokensFromBestTranslation()
		"chunkIndex" : null,       // Set by __updateTokensFromBestTranslation()
		"firstTerm" : "",          // Set by __updateCaretToken()
		"secondTerm" : "",         // Set by __updateCaretToken() and may be modified by __postProcessActiveToken()
		"sep" : "",                // Set by __updateCaretToken()
		"hasCaret" : false,        // Set by __updateCaretToken()
		"isActive" : false,        // Set by __updateActiveTokens()
		"isChanged" : false,
		"isExpired" : false
	};
	return token;
};

TargetState.prototype.__updateTokensFromUserText = function() {
	var allTokens = this.get( "allTokens" );
	var userText = this.get( "userText" );
	var userTokens = userText.split( this.WHITESPACE );
	var userLength = ( userTokens.length + 1 ) / 2;
	while ( allTokens.length < userLength ) {
		allTokens.push( this.__newToken() );
	}
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[ n ];
		if ( n < userLength ) {
			var userWord = userTokens[ n * 2 ];
			var userSep = ( n < userLength - 1 ) ? userTokens[ n * 2 + 1 ] : "";
			token.userWord = userWord;
			token.userSep = userSep;
		}
		else {
			token.userWord = "";
			token.userSep = "";
		}
	}
	this.set( "allTokens", allTokens );
};

TargetState.prototype.__updateTokensFromPrefix = function() {
	var allTokens = this.get( "allTokens" );
	var prefix = this.get( "prefix" );
	var prefixTokens = prefix.split( this.WHITESPACE );
	var prefixLength = ( prefixTokens.length + 1 ) / 2;
	while ( allTokens.length < prefixLength ) {
		allTokens.push( this.__newToken() );
	}
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[ n ];
		if ( n < prefixLength ) {
			var prefixWord = prefixTokens[ n * 2 ];
			token.prefixWord = prefixWord;
		}
		else {
			token.prefixWord = "";
		}
	}
	this.set( "allTokens", allTokens );
};

TargetState.prototype.__updateTokensFromBestTranslation = function() {
	var translationList = this.get( "translationList" );
	if ( translationList.length > 0 ) {
		var allTokens = this.get( "allTokens" );
		var alignIndexList = this.get( "alignIndexList" );
		var chunkIndexList = this.get( "chunkIndexList" );
		var bestTranslation = translationList[ 0 ];
		var bestAlignIndexes = alignIndexList[ 0 ];
		var bestChunkIndexes = chunkIndexList[ 0 ];
		while ( allTokens.length < bestTranslation.length ) {
			allTokens.push( this.__newToken() );
		}
		for ( var n = 0; n < allTokens.length; n++ ) {
			var token = allTokens[ n ];
			if ( n < bestTranslation.length ) {
				var translationWord = bestTranslation[ n ];
				var chunkIndex = bestChunkIndexes[ n ];
				token.translationWord = translationWord;
				token.chunkIndex = chunkIndex;
			}
			else {
				token.translationWord = "";
				token.chunkIndex = null;
			}
			token.sourceTokenIndexes = [];
		}
		for ( var i = 0; i < bestAlignIndexes.length; i++ ) {
			var alignIndex = bestAlignIndexes[i];
			var token = allTokens[ alignIndex.targetIndex ];
			token.sourceTokenIndexes.push( alignIndex.sourceIndex );
		}
		this.set( "allTokens", allTokens );
	}
};

TargetState.prototype.__updateCaretToken = function() {
	var allTokens = this.get( "allTokens" );
	var caretIndex = this.get( "caretIndex" );
	var caretToken = null;
	var tokenIndex = 0;
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[ n ];
		var firstTerm = ( token.userWord !== "" ) ? token.userWord : "";
		var secondTerm = ( token.userWord !== "" ) ? "" : token.translationWord;
		var sep = ( token.userSep !== "" ) ? token.userSep : " ";
		token.firstTerm = firstTerm;
		token.secondTerm = secondTerm;
		token.sep = sep;
		var startTokenIndex = tokenIndex;
		tokenIndex += firstTerm.length;
		tokenIndex += secondTerm.length;
		var endTokenIndex = tokenIndex;
		tokenIndex += sep.length;
		var hasCaret = ( startTokenIndex <= caretIndex ) && ( caretIndex <= endTokenIndex );
		token.hasCaret = hasCaret;
		if ( hasCaret ) {
			caretToken = token;
		}
	}
	this.set({
		"allTokens" : allTokens,
		"caretToken" : caretToken
	});
};

TargetState.prototype.__updateActiveTokens = function() {
	var allTokens = this.get( "allTokens" );
	var caretToken = this.get( "caretToken" );
	var activeTokens = [];
	var activeChunkIndex = null;
	if ( caretToken !== null ) {
		var activeChunkIndex = caretToken.chunkIndex;
		for ( var n = 0; n < allTokens.length; n++ ) {
			var token = allTokens[ n ];
			token.isActive = token.hasCaret  ||  ( activeChunkIndex !== null && token.chunkIndex === activeChunkIndex );
			if ( token.isActive ) {
				activeTokens.push( token );
			}
		}
	}
	this.set({
		"activeTokens" : activeTokens,
		"activeChunkIndex" : activeChunkIndex
	});

	var matchingTranslations = []; // [ "Alice", "Bob", "Candice" ]; // TODO: Identify all matching translations. Need to determine (x, y) coordinate of the first active token.
	for ( var i = 0; i < activeTokens.length; i++ ) {
	}
	this.set( "matchingTranslations", matchingTranslations );

	var segmentId = this.get( "segmentId" );
	if ( activeChunkIndex !== null ) {
		this.trigger( "updateAutocompleteCandidates", segmentId, activeChunkIndex, matchingTranslations, 10, 20 );
	}
	else {
		this.trigger( "updateAutocompleteCandidates", null, null );
	}
};

TargetState.prototype.__updateMatchedSourceTokens = function() {
	var matchedSourceTokens = {};
	var allTokens = this.get( "allTokens" );
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[ n ];
		if ( token.userWord === token.translationWord ) {
			for ( var i = 0; i < token.sourceTokenIndexes.length; i++ ) {
				matchedSourceTokens[ token.sourceTokenIndexes[i] ] = true;
			}
		}
	}
	this.set( "matchedSourceTokens", matchedSourceTokens );

	var segmentId = this.get( "segmentId" );
	this.trigger( "updateMatchedSourceTokens", segmentId, matchedSourceTokens );
};

TargetState.prototype.__checkForChangedTokens = function() {
	var allTokens = this.get( "allTokens" );
	var isChanged = this.get( "isChanged" );
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[ n ];
		var isTokenChanged = ( token.userWord !== token.prefixWord  &&  ! token.hasCaret );
		token.isChanged = isTokenChanged;
		isChanged = isChanged || isTokenChanged;
	}
	this.set( "isChanged", isChanged );
};

TargetState.prototype.__checkForExpiredTokens = function() {
	var allTokens = this.get( "allTokens" );
	var isExpired = this.get( "isExpired" );
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[ n ];
		var isTokenExpired = ( token.userWord !== token.prefixWord  &&  token.userWord !== token.translationWord  &&  ! token.hasCaret );
		token.isExpired = isTokenExpired;
		isExpired = isExpired || isTokenExpired;
	}
	this.set( "isExpired", isExpired );
};

TargetState.prototype.__checkFocus = function( hasFocus ) {
	if ( hasFocus === undefined ) { hasFocus = this.get( "hasFocus" ) }
	var hadFocus = ( this.get( "hasFocus" ) === true );
	this.set({
		"hasFocus" : hasFocus,
		"hadFocus" : hadFocus
	});
};

