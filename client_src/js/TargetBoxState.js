var TargetBoxState = Backbone.Model.extend({
	defaults : {
		// Initialized once by PTM
		"segmentId" : null,
		"chunkIndexes" : [],
		
		// States based on user inputs
		"userText" : "",
		"caretIndex" : 0,
		"hasFocus" : false,
		
		// States based on machine translations
		"prefix" : null,        // @value {string} Prefix used to generate the translations.
		"translationList" : [], // @value {string[][]} A list of translations. For each translation: a list of tokens represented as a string.
		"alignIndexList" : [],  // @value {Object[][]} For each translation: a list of objects {sourceIndex: number, targetIndex: number}.
		
		// Derived states
		"userTokens" : [ "" ],
		"prefixTokens" : [],
		"suggestionList" : [],
		"isExpired" : false,
		"bestTranslation" : [],       // @value {string[]} A list of tokens in the best translation.
		"showBestTranslation" : true, // @value {boolean} True if userText is empty or if this target box's textarea has input focus.
		"suggestions" : [],           // @value {string[]} A list of suggestions matching the current user's input
		"showSuggestions" : true,     // @value {boolean} True if caret is at the end of this target box's text area.
		"matchingTokens" : {}
	}
});

TargetBoxState.prototype.WHITESPACE = /[ ]+/g;

TargetBoxState.prototype.initialize = function() {
	this.updateSuggestionList = _.debounce( this.__updateSuggestionList, 10 );
	this.updateBestTranslation = _.debounce( this.__updateBestTranslation, 10 );
	this.updateSuggestions = _.debounce( this.__updateSuggestions, 10 );
	this.updateMatchingTokens = _.debounce( this.__updateMatchingTokens, 10 );
	this.updateShowBestTranslations = _.debounce( this.__updateShowBestTranslations, 10 );
	this.updateShowSuggestions = _.debounce( this.__updateShowSuggestions, 10 );
	this.on( "change:prefix", this.updatePrefixTokens );
	this.on( "change:userText", this.updateUserTokens );
	this.on( "change:userTokens", this.updateTranslations );
	this.on( "change:userTokens change:translationList", this.updateBestTranslation );
	this.on( "change:userTokens change:suggestionList", this.updateSuggestions );
	this.on( "change:userTokens change:alignIndexList", this.updateMatchingTokens );
	this.on( "change:userTokens change:hasFocus", this.updateShowBestTranslations );
	this.on( "change:userTokens change:caretIndex", this.updateShowSuggestions );
	this.on( "change:hasFocus", this.updateFocus );
};

TargetBoxState.prototype.updatePrefixTokens = function() {
	var prefix = this.get( "prefix" );
	var prefixTokens = prefix.split( this.WHITESPACE );

	var userTokens = this.get( "userTokens" );
	var targetTokenIndex = userTokens.length - 1;
	var translationList = this.get( "translationList" );
	var alignIndexList = this.get( "alignIndexList" );
	var chunkIndexes = this.get( "chunkIndexes" );
	var suggestionList = [];
	for ( var translationIndex = 0; translationIndex < translationList.length; translationIndex++ ) {
		var translation = translationList[ translationIndex ];
		var alignIndexes = alignIndexList[ translationIndex ];
		
//		console.log( "targetTokenIndex", targetTokenIndex );
		
		// All source tokens that correspond to the target token containing the caret
		var sourceTokenIndexes = {};
		for ( var a = 0; a < alignIndexes.length; a++ ) {
			var alignment = alignIndexes[a];
			if ( alignment.targetIndex === targetTokenIndex ) {
				sourceTokenIndexes[ alignment.sourceIndex ] = true;
			}
		}

//		console.log( "sourceTokenIndexes", _.keys(sourceTokenIndexes) )
		
		// All chunk indexes that belong to the source tokens
		var currentChunkIndexes = {};
		for ( var sourceTokenIndex = 0; sourceTokenIndex < chunkIndexes.length; sourceTokenIndex++ ) {
			var chunkIndex = chunkIndexes[ sourceTokenIndex ];
			if ( sourceTokenIndexes.hasOwnProperty( sourceTokenIndex ) ) {
				currentChunkIndexes[ chunkIndex ] = true;
			}
		}

//		console.log( "currentChunkIndexes", _.keys(currentChunkIndexes) )
		
		// Expand to include all source tokens that are belong to the same chunk indexes
		var currentSourceTokenIndexes = {};
		for ( var sourceTokenIndex = 0; sourceTokenIndex < chunkIndexes.length; sourceTokenIndex++ ) {
			var chunkIndex = chunkIndexes[ sourceTokenIndex ];
			if ( currentChunkIndexes.hasOwnProperty( chunkIndex ) ) {
				currentSourceTokenIndexes[ sourceTokenIndex ] = true;
			}
		}

//		console.log( "currentSourceTokenIndexes", _.keys(currentSourceTokenIndexes) )
		
		// All target tokens that correspond to the source tokens
		var currentTargetTokenIndexes = {};
		var maxTargetTokenIndex = targetTokenIndex;
		for ( var a = 0; a < alignIndexes.length; a++ ) {
			var alignment = alignIndexes[a];
			if ( currentSourceTokenIndexes.hasOwnProperty( alignment.sourceIndex ) ) {
				currentTargetTokenIndexes[ alignment.targetIndex ] = true;
				maxTargetTokenIndex = Math.max( maxTargetTokenIndex, alignment.targetIndex );
			}
		}

//		console.log( "currentTargetTokenIndexes", _.keys(currentTargetTokenIndexes) )
//		console.log( "maxTargetTokenIndex", targetTokenIndex, maxTargetTokenIndex )
				
		// Extract suggestion text
		var suggestionTokens = translation.slice( targetTokenIndex, maxTargetTokenIndex + 1 );
		if ( suggestionTokens.length > 0 ) {
			var suggestionText = suggestionTokens.join(" ");
			if ( suggestionList.indexOf( suggestionText ) === -1 ) {
				suggestionList.push( suggestionText );
			}
		}
	}
	
//	console.log( "suggestionList", suggestionList, translationList );

	this.set({
		"prefixTokens" : prefixTokens,
		"suggestionList" : suggestionList,
		"isExpired" : false
	});
};

TargetBoxState.prototype.updateUserTokens = function() {
	var userText = this.get( "userText" );
	var userTokens = userText.split( this.WHITESPACE );
	this.set({
		"userTokens" : userTokens
	});
};

TargetBoxState.prototype.updateTranslations = function() {
	var segmentId = this.get( "segmentId" );
	var userTokens = this.get( "userTokens" );
	this.trigger( "updateTranslations", segmentId, userTokens.slice( 0, userTokens.length-1 ).join(" ") );
/*
	var isExpired = this.get( "isExpired" );
	if ( ! isExpired ) {
		if ( userTokens.length !== prefixTokens.length ) {
			isExpired = true;
		}
		else {
			for ( var i = 0; i < userTokens.length - 1; i ++ ) {
				if ( userTokens[i] !== prefixTokens[i] ) {
					isExpired = true;
					break;
				}
			}
		}
		if ( isExpired ) {
			var segmentId = this.get( "segmentId" );
			var userText = this.get( "userText" );
			console.log( "isExpired", segmentId, userText );
			this.trigger( "updateTranslations", segmentId, userText );
		}
		this.set({
			"isExpired" : isExpired
		});
	}
*/
};

TargetBoxState.prototype.updateFocus = function() {
	var segmentId = this.get( "segmentId" );
	var hasFocus = this.get( "hasFocus" );
	this.trigger( "updateFocus", segmentId, hasFocus );
};

TargetBoxState.prototype.__updateBestTranslation = function() {
	var bestTranslation = [];
	var userTokens = this.get( "userTokens" );
	var userToken = userTokens[ userTokens.length - 1 ];

	var translationList = this.get( "translationList" );
	var translationIndex = 0;
	if ( translationList.length > translationIndex ) {
		var mtTokens = translationList[translationIndex];
		if ( mtTokens.length > userTokens.length ) {
			var mtToken = mtTokens[ userTokens.length - 1 ];
			if ( mtToken.substr( 0, userToken.length ) === userToken ) {
				bestTranslation.push( mtToken.substr( userToken.length ) );
			}
			else {
				bestTranslation.push( "" )
			}
			for ( var n = userTokens.length; n < mtTokens.length; n++ ) {
				var mtToken = mtTokens[n];
				bestTranslation.push( mtToken );
			}
		}
	}
//	console.log( "bestTranslation", bestTranslation, translationList[translationIndex] );
	this.set( "bestTranslation", bestTranslation );
	this.trigger( "updateBestTranslation", this.get( "segmentId" ), bestTranslation )
};

TargetBoxState.prototype.__updateSuggestions = function() {
	var suggestions = [];
	var userTokens = this.get( "userTokens" );
	var userToken = userTokens[ userTokens.length - 1 ];
	var suggestionList = this.get( "suggestionList" );
	for ( var suggestionIndex = 0; suggestionIndex < suggestionList.length; suggestionIndex++ ) {
		var suggestion = suggestionList[suggestionIndex];
		if ( suggestion.substr( 0, userToken.length ) === userToken ) {
			suggestions.push( suggestion );
		}
	}
//	console.log( "suggestions", suggestions );
	this.set( "suggestions", suggestions );
	this.trigger( "updateSuggestions", this.get( "segmentId" ), suggestions );
};

TargetBoxState.prototype.__updateMatchingTokens = function() {
	var matchingTokens = {};
	var userText = this.get( "userText" );
	var alignIndexList = this.get( "alignIndexList" );
	if ( alignIndexList.length > 0 ) {
		var bestAlignIndexes = alignIndexList[0];
		var userTokens = userText.split( this.WHITESPACE );
		for ( var a = 0; a < bestAlignIndexes.length; a++ ) {
			var alignment = bestAlignIndexes[a];
			var sourceIndex = alignment.sourceIndex;
			var targetIndex = alignment.targetIndex;
			if ( targetIndex < userTokens.length - 1 ) {
				matchingTokens[ sourceIndex ] = true;
			}
		}
	}
	console.log( "matchingTokens", _.keys(matchingTokens) );
	this.set( "matchingTokens", matchingTokens );
	this.trigger( "updateMatchingTokens", this.get( "segmentId" ), matchingTokens );
};

TargetBoxState.prototype.__updateShowBestTranslations = function() {
	var hasFocus = this.get( "hasFocus" );
	var userText = this.get( "userText" );
	var showBestTranslations = ( hasFocus || userText.length === 0 );
	this.set( "showBestTranslations", showBestTranslations );
};

TargetBoxState.prototype.__updateShowSuggestions = function() {
	var caretIndex = this.get( "caretIndex" );
	var userText = this.get( "userText" );
	var showSuggestions = ( caretIndex === userText.length );
	this.set( "showSuggestions", showSuggestions );
};
