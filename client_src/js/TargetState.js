var TargetState = Backbone.Model.extend({
	defaults : {
		// Initialized once by PTM...
		"segmentId" : null,
		
		// States based on user inputs...
		"userText" : "",
		"caretIndex" : 0,
		
		// States based on machine translations...
		"prefix" : "",
		"translationList" : [],
		"alignIndexList" : [],
		"chunkIndexList" : [],
		"hasFocus" : null,
		
		// Derived internal states...
		"bestTranslation" : [],
		"bestAlignIndexes" : [],
		"bestChunkIndexes" : [],
		"suggestionsByChunk" : {},

		"allTokens" : [],
		"caretToken" : null,
		"activeTokens" : [],
		"activeChunkIndex" : null,
		"activeXCoord" : null,
		"activeYCoord" : null,
		"matchedTokens" : [],
		"hadFocus" : null,      // Previous value of hasFocus, for triggering a focus() event on the underlying textarea
		
		// Derived external states...
		"matchingTranslations" : [],
		"matchedSourceTokenIndexes" : {},
		"isChanged" : false,    // Whether user-entered text has changed from the prefix used to generate the current list of translations
		"isExpired" : false     // Whether user-entered text has changed from the prefix AND is also different from the current best translation
	}
});

TargetState.prototype.WHITESPACE = /([ ]+)/g;

TargetState.prototype.postProcess = function() {
	var segmentId = this.get( "segmentId" );
	
	var matchedSourceTokenIndexes = this.get( "matchedSourceTokenIndexes" );
	this.trigger( "updateMatchedSourceTokens", segmentId, matchedSourceTokenIndexes );
	
	var activeChunkIndex = this.get( "activeChunkIndex" );
	if ( activeChunkIndex !== null ) {
		var matchingTranslations = this.get( "matchingTranslations" );
		var activeXCoord = this.get( "activeXCoord" );
		var activeYCoord = this.get( "activeYCoord" );
		this.trigger( "updateAutocompleteCandidates", segmentId, activeChunkIndex, matchingTranslations, activeXCoord, activeYCoord );
	}
	else {
		this.trigger( "updateAutocompleteCandidates", null, null );
	}
	
	var isChanged = this.get( "isChanged" );
	// No actions

	var isExpired = this.get( "isExpired" );
	if ( isExpired ) {
		var userText = this.get( "userText" );  //TODO determine prefix
		console.log( "Will send updateTranslations event.", segmentId, userText );
		this.trigger( "updateTranslations", segmentId, userText );
	}
};

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
	this.__updateSuggestionsFromAllTranslations();
	this.__updateTokensFromUserText();
	this.__updateCaretToken();
	this.__updateActiveTokens();
	this.__updateMatchingTranslations();
	this.__updateMatchedTokens();
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
	this.__updateMatchingTranslations();
	this.__updateMatchedTokens();
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
		"userWord" : "",           // Set by __updateTokensFromUserText()
		"userSep" : "",            // Set by __updateTokensFromUserText()
		"prefixWord" : "",         // Set by __updateTokensFromPrefix()
		"translationWord" : "",    // Set by __updateTokensFromBestTranslation()
		"sourceTokenIndexes" : [], // Set by __updateTokensFromBestTranslation()
		"chunkIndex" : null,       // Set by __updateTokensFromBestTranslation()
		"firstTerm" : "",          // Set by __updateCaretToken()
		"secondTerm" : "",         // Set by __updateCaretToken() and may be modified by __updateMatchingTranslations()
		"sep" : "",                // Set by __updateCaretToken()
		"hasCaret" : false,        // Set by __updateCaretToken()
		"isActive" : false,        // Set by __updateActiveTokens()
		"isFirstActive" : false,   // Set by __updateActiveTokens()
		"isLastActive" : false,    // Set by __updateActiveTokens()
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
	var alignIndexList = this.get( "alignIndexList" );
	var chunkIndexList = this.get( "chunkIndexList" );
	var bestTranslation = [];
	var bestAlignIndexes = [];
	var bestChunkIndexes = [];
	if ( translationList.length > 0 ) {
		bestTranslation = translationList[0];
		bestAlignIndexes = alignIndexList[0];
		bestChunkIndexes = chunkIndexList[0];
	}

	var allTokens = this.get( "allTokens" );
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
	this.set({
		"allTokens" : allTokens,
		"bestTranslation" : bestTranslation,
		"bestAlignIndexes" : bestAlignIndexes,
		"bestChunkIndexes" : bestChunkIndexes
	});
};

TargetState.prototype.__updateSuggestionsFromAllTranslations = function() {
	var suggestionsByChunk = {};
	var translationList = this.get( "translationList" );
	var chunkIndexList = this.get( "chunkIndexList" );
	for ( var translationIndex = 0; translationIndex < translationList.length; translationIndex++ ) {
		var translation = translationList[ translationIndex ];
		var chunkIndexes = chunkIndexList[ translationIndex ];
		for ( var n = 0; n < translation.length; n++ ) {
			var token = translation[n];
			var chunkIndex = chunkIndexes[n];
			if ( chunkIndex !== null ) {
				if ( !suggestionsByChunk.hasOwnProperty( chunkIndex ) ) {
					suggestionsByChunk[ chunkIndex ] = _.range( translationList.length ).map( function(d) { return [] } );
				}
				suggestionsByChunk[ chunkIndex ][ translationIndex ].push( token );
			}
		}
	}
	for ( var chunkIndex in suggestionsByChunk ) {
		for ( var translationIndex = 0; translationIndex < suggestionsByChunk[ chunkIndex ].length; translationIndex++ ) {
			suggestionsByChunk[ chunkIndex ][ translationIndex ] = suggestionsByChunk[ chunkIndex ][ translationIndex ].join( " " );
		}
	}
	this.set( "suggestionsByChunk", suggestionsByChunk );
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
	var firstActiveToken = null;
	var lastActiveToken = null;
	var activeChunkIndex = null;
	if ( caretToken !== null ) {
		var activeChunkIndex = caretToken.chunkIndex;
		for ( var n = 0; n < allTokens.length; n++ ) {
			var token = allTokens[ n ];
			token.isActive = token.hasCaret  ||  ( activeChunkIndex !== null && token.chunkIndex === activeChunkIndex );
			token.isFirstActive = false;
			token.isLastActive = false;
			if ( token.isActive ) {
				activeTokens.push( token );
				if ( firstActiveToken === null ) { firstActiveToken = token }
				lastActiveToken = token;
			}
		}
	}
	if ( firstActiveToken !== null ) {
		firstActiveToken.isFirstActive = true;
	}
	if ( lastActiveToken !== null ) {
		lastActiveToken.isLastActive = true;
	}
	this.set({
		"activeTokens" : activeTokens,
		"activeChunkIndex" : activeChunkIndex
	});
};

TargetState.prototype.__updateMatchingTranslations = function() {
	var activeChunkIndex = this.get( "activeChunkIndex" );
	var suggestionsByChunk = this.get( "suggestionsByChunk" );
	var matchingTranslations = [];
	if ( activeChunkIndex !== null ) {
		matchingTranslations = suggestionsByChunk[ activeChunkIndex ];
	}
	this.set( "matchingTranslations", matchingTranslations );
};

TargetState.prototype.__updateMatchedTokens = function() {
	var matchedTokens = [];
	var matchedSourceTokenIndexes = {};
	var allTokens = this.get( "allTokens" );
	for ( var n = 0; n < allTokens.length; n++ ) {
		var token = allTokens[ n ];
	}
	for ( var i = 0; i < matchedTokens.length; i++ ) {
		var token = matchedTokens[i];
		for ( var i = 0; i < token.sourceTokenIndexes.length; i++ ) {
			matchedSourceTokenIndexes[ token.sourceTokenIndexes[i] ] = true;
		}
	}
	this.set({
		"matchedTokens" : matchedTokens,
		"matchedSourceTokenIndexes" : matchedSourceTokenIndexes
	});
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

