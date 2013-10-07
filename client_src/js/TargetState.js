var TargetState = Backbone.Model.extend({
	defaults : {
						     	// Initialized once
		"segmentId" : null,
		                        // Updated by user
		"userText" : "",        // User-entered text in target language
		"prefix" : "",          // User-entered text, excluding word currently being edited
		"translationList" : [],
		"alignIndexList" : [],
		"chunkIndexList" : [],
		"caretIndex" : 0,
		"hasFocus" : false,
							    // Derived states
		"allTokens" : [],
		"activeToken" : null,
		"isChanged" : false,    // User-entered text changed from prefix used to generate the current list of translations
		"isExpired" : false     // Expired if user-entered text differs from prefix or the current best translation
	}
});

TargetState.prototype.WHITESPACE = /([ ]+)/g;

TargetState.prototype.updateTranslations = function( prefix, translationList, alignIndexList, chunkIndexList ) {
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
	this.__updateTokensFromCaretIndex();
	this.__updateActiveToken();
	this.__checkForChangedTokens();
	this.__checkForExpiredTokens();
	this.trigger( "modified" );
};

TargetState.prototype.updateUserText = function( userText, caretIndex ) {
	this.set({
		"userText" : userText,
		"caretIndex" : caretIndex
	});
	this.__updateTokensFromUserText();
	this.__updateTokensFromCaretIndex();
	this.__updateActiveToken();
	this.__checkForChangedTokens();
	this.__checkForExpiredTokens();
	this.trigger( "modified" );
};

TargetState.prototype.updateFocus = function( hasFocus ) {
	this.set({
		"hasFocus" : hasFocus
	});
	this.trigger( "modified" );
};

TargetState.prototype.__resetTokens = function() {
	this.set({
		"allTokens" : [],
		"isChanged" : false,
		"isExpired" : false
	});
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
	}
	this.set( "allTokens", allTokens );
};

TargetState.prototype.__updateTokensFromCaretIndex = function() {
	var allTokens = this.get( "allTokens" );
	var caretIndex = this.get( "caretIndex" );
	var activeToken = null;
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
			activeToken = token;
		}
	}
	this.set({
		"allTokens" : allTokens,
		"activeToken" : activeToken
	});
};

TargetState.prototype.__updateActiveToken = function() {
	var allTokens = this.get( "allTokens" );
	var activeToken = this.get( "activeToken" );
	if ( activeToken !== null ) {
		var chunkIndex = activeToken.chunkIndex;
		if ( chunkIndex !== null ) {
			for ( var n = 0; n < allTokens.length; n++ ) {
				var token = allTokens[ n ];
				token.isActive = token.hasCaret || ( token.chunkIndex === chunkIndex );
			}
		}
		else {
			for ( var n = 0; n < allTokens.length; n++ ) {
				var token = allTokens[ n ];
				token.isActive = token.hasCaret;
			}
		}
	}
	this.set({
		"allTokens" : allTokens
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

TargetState.prototype.__newToken = function() {
	var token = {
		"hasUser" : false,
		"userWord" : "",
		"userSep" : "",
		"prefixWord" : "",
		"translationWord" : "",
		"sourceTokenIndexes" : [],
		"chunkIndex" : null,
		"term" : "",
		"sep" : "",
		"hasCaret" : false,
		"isActive" : false,
		"isChanged" : false,
		"isExpired" : false
	};
	return token;
};
