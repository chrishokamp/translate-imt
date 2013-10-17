var TargetBoxState = Backbone.Model.extend({
	defaults : {
		// Initialized once by PTM
		"segmentId" : null,
		"chunkIndexes" : [],
		
		// States based on machine translations
		"prefix" : null,        // @value {string} Prefix used to generate the translations.
		"translationList" : [], // @value {string[][]} A list of translations. For each translation: a list of tokens represented as a string.
		"alignIndexList" : [],  // @value {Object[][]} For each translation: a list of objects {sourceIndex: number, targetIndex: number}.

		// States based on user inputs
		"caretIndex" : 0,
		"hasFocus" : false,

		// State based on user inputs both within and outside of TargetBox
		"userText" : "",
		
		// Derived states
		"userTokens" : [ "" ],
		"userPrefix" : "",
		"userSep" : "",
		"userWord" : "",
		"prefixTokens" : [],
		"suggestionList" : [],
		"remainingSentence" : [],       // @value {string[]} A list of tokens in the best translation.
		"showRemainingSentence" : true, // @value {boolean} True if userText is empty or if this target box's textarea has input focus.
		"suggestions" : [],           // @value {string[]} A list of suggestions matching the current user's input
		"showSuggestions" : true,     // @value {boolean} True if caret is at the end of this target box's text area.
		"matchingTokens" : {},
		
		// States based on graphics rendering results
		"canvasXCoord" : 0,
		"canvasYCoord" : 0,
		"caretXCoord" : 0,
		"caretYCoord" : 0,
		"editXCoord" : 0,
		"editYCoord" : 0
	}
});

TargetBoxState.prototype.WIDTH = 775;
TargetBoxState.prototype.MIN_HEIGHT = 50;
TargetBoxState.prototype.ANIMATION_DURATION = 120;
TargetBoxState.prototype.IMMEDIATELY = 5;  // milliseconds

TargetBoxState.prototype.WHITESPACE = /[ ]+/g;
TargetBoxState.prototype.WHITESPACE_SEPS = /([ ]+)/g;

TargetBoxState.prototype.initialize = function() {
	this.updateSuggestionList = _.debounce( this.__updateSuggestionList, this.IMMEDIATELY );
	this.updateRemainingSentence = _.debounce( this.__updateRemainingSentence, this.IMMEDIATELY );
	this.updateShowRemainingSentences = _.debounce( this.__updateShowRemainingSentences, this.IMMEDIATELY );
	this.updateSuggestions = _.debounce( this.__updateSuggestions, this.IMMEDIATELY );
	this.updateShowSuggestions = _.debounce( this.__updateShowSuggestions, this.IMMEDIATELY );
	this.updateMatchingTokens = _.debounce( this.__updateMatchingTokens, this.IMMEDIATELY );
	this.triggerUpdateEditCoords = _.debounce( this.__triggerUpdateEditCoords, this.IMMEDIATELY );
	this.on( "change:prefix", this.updatePrefixTokensAndSuggestionList );
	this.on( "change:userText", this.updateUserTokens );
	this.on( "change:userPrefix", this.triggerUpdateTranslations );
	this.on( "change:userTokens change:translationList", this.updateRemainingSentence );
	this.on( "change:userTokens change:suggestionList", this.updateSuggestions );
	this.on( "change:userTokens change:alignIndexList", this.updateMatchingTokens );
	this.on( "change:userTokens change:hasFocus", this.updateShowRemainingSentences );
	this.on( "change:userTokens change:caretIndex", this.updateShowSuggestions );
	this.on( "change:hasFocus", this.triggerUpdateFocus );
	this.on( "change:caretIndex", this.triggerUpdateCaretIndex );
	this.on( "change:editXCoord change:editYCoord", this.triggerUpdateEditCoords );
};

TargetBoxState.prototype.updatePrefixTokensAndSuggestionList = function() {
	var prefix = this.get( "prefix" );
	var prefixTokens = prefix.split( this.WHITESPACE );

	var userTokens = this.get( "userTokens" )
	var targetTokenIndex = userTokens.length - 1;
	var translationList = this.get( "translationList" ); // prefix is always updated whenever translationList or alignIndexList
	var alignIndexList = this.get( "alignIndexList" );   // is updated, and therefore trigger on change:prefix only.
	var chunkIndexes = this.get( "chunkIndexes" );       // chunkIndexes is never changed after initialization.
	var suggestionList = [];
	for ( var translationIndex = 0; translationIndex < translationList.length; translationIndex++ ) {
		var translation = translationList[ translationIndex ];
		var alignIndexes = alignIndexList[ translationIndex ];

		// All source tokens that correspond to the target token containing the caret
		var sourceTokenIndexes = {};
		for ( var a = 0; a < alignIndexes.length; a++ ) {
			var alignment = alignIndexes[a];
			if ( alignment.targetIndex === targetTokenIndex ) {
				sourceTokenIndexes[ alignment.sourceIndex ] = true;
			}
		}

		// All chunk indexes that belong to the source tokens
		var currentChunkIndexes = {};
		for ( var sourceTokenIndex = 0; sourceTokenIndex < chunkIndexes.length; sourceTokenIndex++ ) {
			var chunkIndex = chunkIndexes[ sourceTokenIndex ];
			if ( sourceTokenIndexes.hasOwnProperty( sourceTokenIndex ) ) {
				currentChunkIndexes[ chunkIndex ] = true;
			}
		}

		// Expand to include all source tokens that have the same chunk indexes
		var currentSourceTokenIndexes = {};
		for ( var sourceTokenIndex = 0; sourceTokenIndex < chunkIndexes.length; sourceTokenIndex++ ) {
			var chunkIndex = chunkIndexes[ sourceTokenIndex ];
			if ( currentChunkIndexes.hasOwnProperty( chunkIndex ) ) {
				currentSourceTokenIndexes[ sourceTokenIndex ] = true;
			}
		}

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
				
		// Extract suggestion text
		var suggestionTokens = translation.slice( targetTokenIndex, maxTargetTokenIndex + 1 );
		if ( suggestionTokens.length > 0 ) {
			var suggestionText = suggestionTokens.join(" ");
			if ( suggestionList.indexOf( suggestionText ) === -1 ) {
				suggestionList.push( suggestionText );
			}
		}
	}
	this.set({
		"prefixTokens" : prefixTokens,
		"suggestionList" : suggestionList
	});
};

TargetBoxState.prototype.updateUserTokens = function() {
	var userText = this.get( "userText" );
	var userTokens = userText.split( this.WHITESPACE );
	var userPrefix = "";
	var userSep = "";
	var userWord = userText;
	if ( userTokens.length > 1 ) {
		var userTokensAndSeps = userText.split( this.WHITESPACE_SEPS );
		userPrefix = userTokensAndSeps.slice( 0, userTokensAndSeps.length-2 ).join("");
		userSep = userTokensAndSeps[ userTokensAndSeps.length-2 ];
		userWord = userTokensAndSeps[ userTokensAndSeps.length-1 ];
	}
	this.set({
		"userTokens" : userTokens,
		"userPrefix" : userPrefix,
		"userSep" : userSep,
		"userWord" : userWord
	});
};

TargetBoxState.prototype.triggerUpdateTranslations = function() {
	var segmentId = this.get( "segmentId" );
	var userPrefix = this.get( "userPrefix" );
	this.trigger( "updateTranslations", segmentId, userPrefix );
};

TargetBoxState.prototype.__updateRemainingSentence = function() {
	var remainingSentence = [];
	var userTokens = this.get( "userTokens" );
	var userToken = userTokens[ userTokens.length - 1 ];

	var translationList = this.get( "translationList" );
	var translationIndex = 0;
	if ( translationList.length > translationIndex ) {
		var mtTokens = translationList[translationIndex];
		if ( mtTokens.length > userTokens.length ) {
			var mtToken = mtTokens[ userTokens.length - 1 ];
			if ( mtToken.substr( 0, userToken.length ) === userToken ) {
				remainingSentence.push( mtToken.substr( userToken.length ) );
			}
			else {
				remainingSentence.push( "" )
			}
			for ( var n = userTokens.length; n < mtTokens.length; n++ ) {
				var mtToken = mtTokens[n];
				remainingSentence.push( mtToken );
			}
		}
	}
//	console.log( "remainingSentence", remainingSentence, translationList[translationIndex] );
	this.set( "remainingSentence", remainingSentence );
	this.trigger( "updateRemainingSentence", this.get( "segmentId" ), remainingSentence )
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
	var userTokens = this.get( "userTokens" );
	var alignIndexList = this.get( "alignIndexList" );
	if ( alignIndexList.length > 0 ) {
		var bestAlignIndexes = alignIndexList[0];
		for ( var a = 0; a < bestAlignIndexes.length; a++ ) {
			var alignment = bestAlignIndexes[a];
			var sourceIndex = alignment.sourceIndex;
			var targetIndex = alignment.targetIndex;
			if ( targetIndex < userTokens.length - 1 ) {
				matchingTokens[ sourceIndex ] = true;
			}
		}
	}
//	console.log( "matchingTokens", _.keys(matchingTokens) );
	this.set( "matchingTokens", matchingTokens );
	this.trigger( "updateMatchingTokens", this.get( "segmentId" ), matchingTokens );
};

TargetBoxState.prototype.__updateShowRemainingSentences = function() {
	var hasFocus = this.get( "hasFocus" );
	var userText = this.get( "userText" );
	var showRemainingSentences = ( hasFocus || userText.length === 0 );
	this.set( "showRemainingSentences", showRemainingSentences );
};

TargetBoxState.prototype.__updateShowSuggestions = function() {
	var caretIndex = this.get( "caretIndex" );
	var userText = this.get( "userText" );
	var showSuggestions = ( caretIndex === userText.length );
	this.set( "showSuggestions", showSuggestions );
};

TargetBoxState.prototype.triggerUpdateFocus = function() {
	var segmentId = this.get( "segmentId" );
	var hasFocus = this.get( "hasFocus" );
	this.trigger( "updateFocus", segmentId, hasFocus );
};

TargetBoxState.prototype.triggerUpdateCaretIndex = function() {
	var segmentId = this.get( "segmentId" );
	var caretIndex = this.get( "caretIndex" );
	this.trigger( "updateCaretIndex", segmentId, caretIndex );
};

TargetBoxState.prototype.__triggerUpdateEditCoords = function() {
	var segmentId = this.get( "segmentId" );
	var editXCoord = this.get( "editXCoord" );
	var editYCoord = this.get( "editYCoord" );
	this.trigger( "updateEditCoords", segmentId, editXCoord, editYCoord );
};
