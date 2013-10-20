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
		"editingPrefix" : "",
		"overlayPrefix" : "",
		"overlaySep" : "",
		"overlayEditing" : "",
		"prefixTokens" : [],
		"suggestionList" : [],
		"bestTranslation" : [],       // @value {string[]} A list of tokens in the best translation.
		"showBestTranslation" : true, // @value {boolean} True if userText is empty or if this target box's textarea has input focus.
		"suggestions" : [],           // @value {string[]} A list of suggestions matching the current user's input
		"showSuggestions" : true,     // @value {boolean} True if caret is at the end of this target box's text area.
		"matchingTokens" : {},
		
		// States based on graphics rendering results
		"caretXCoord" : null,
		"caretYCoord" : null,
		"editXCoord" : null,
		"editYCoord" : null,
		"canvasXCoord" : null,
		"canvasYCoord" : null
	}
});

TargetBoxState.prototype.WIDTH = 775;
TargetBoxState.prototype.MIN_HEIGHT = 30;
TargetBoxState.prototype.ANIMATION_DURATION = 120;
TargetBoxState.prototype.IMMEDIATELY = 5;  // milliseconds

TargetBoxState.prototype.WHITESPACE = /[ ]+/g;
TargetBoxState.prototype.WHITESPACE_SEPS = /([ ]+)/g;

TargetBoxState.prototype.initialize = function( options ) {
	var segmentId = options.segmentId;
	this.view = new TargetBoxView({ "model" : this, "el" : ".TargetBoxView" + segmentId, "segmentId" : segmentId });
	this.viewTextarea = new TargetTextareaView({ "model" : this, "el" : ".TargetTextareaView" + segmentId });
	this.viewOverlay = new TargetOverlayView({ "model" : this, "el" : ".TargetOverlayView" + segmentId });
	this.updateSuggestionList = _.debounce( this.__updateSuggestionList, this.IMMEDIATELY );
	this.updateBestTranslation = _.debounce( this.__updateBestTranslation, this.IMMEDIATELY );
	this.updateShowBestTranslations = _.debounce( this.__updateShowBestTranslations, this.IMMEDIATELY );
	this.updateSuggestions = _.debounce( this.__updateSuggestions, this.IMMEDIATELY );
	this.updateShowSuggestions = _.debounce( this.__updateShowSuggestions, this.IMMEDIATELY );
	this.updateMatchingTokens = _.debounce( this.__updateMatchingTokens, this.IMMEDIATELY );
	this.triggerUpdateEditCoords = _.debounce( this.__triggerUpdateEditCoords, this.IMMEDIATELY );
	this.on( "change:prefix", this.updatePrefixTokensAndSuggestionList );
	this.on( "change:userText change:prefixTokens", this.updateUserTokens );
	this.on( "change:editingPrefix", this.triggerUpdateTranslations );
	this.on( "change:userTokens change:translationList", this.updateBestTranslation );
	this.on( "change:userTokens change:suggestionList", this.updateSuggestions );
	this.on( "change:userTokens change:alignIndexList", this.updateMatchingTokens );
	this.on( "change:userTokens change:hasFocus", this.updateShowBestTranslations );
	this.on( "change:userTokens change:caretIndex", this.updateShowSuggestions );
	this.on( "change:hasFocus", this.triggerUpdateFocus );
	this.on( "change:caretIndex", this.triggerUpdateCaretIndex );
	this.on( "change:editXCoord change:editYCoord change:canvasXCoord change:canvasYCoord", this.triggerUpdateEditCoords );
};

TargetBoxState.prototype.updatePrefixTokensAndSuggestionList = function() {
	var prefix = this.get( "prefix" );
	var prefixTokens = prefix.split( this.WHITESPACE );

	var targetTokenIndex = ( prefix === "" ) ? 0 : prefixTokens.length;
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

		// Expand to include all source tokens that are belong to the same chunk indexes
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
	var userTokensAndSeps = userText.split( this.WHITESPACE_SEPS );
	var prefix = this.get( "prefix" );
	var prefixTokens = this.get( "prefixTokens" );
	
	var editingPrefix = "";
	var overlayPrefix = userText;
	var overlaySep = "";
	var overlayEditing = "";
	if ( userText === "" ) {
		overlayPrefix = "";
		overlaySep = "";
		overlayEditing = ""
	}
	else if ( prefix === "" ) {
		overlayPrefix = "";
		overlaySep = "";
		overlayEditing = userText;
	}
	else if ( userTokens.length > prefixTokens.length ) {
		overlayPrefix = userTokensAndSeps.slice( 0, prefixTokens.length*2-1 ).join("");
		overlaySep = userTokensAndSeps[ prefixTokens.length*2-1 ];
		overlayEditing = userTokensAndSeps.slice( prefixTokens.length*2 ).join("");
	}
	if ( userTokens.length > 1 ) {
		editingPrefix = userTokensAndSeps.slice( 0, userTokensAndSeps.length-2 ).join("");
	}
	this.set({
		"userTokens" : userTokens,
		"editingPrefix" : editingPrefix,
		"overlayPrefix" : overlayPrefix,
		"overlaySep" : overlaySep,
		"overlayEditing" : overlayEditing
	});
};

TargetBoxState.prototype.triggerUpdateTranslations = function() {
	var segmentId = this.get( "segmentId" );
	var editingPrefix = this.get( "editingPrefix" );
	this.trigger( "updateTranslations", segmentId, editingPrefix );
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
	var canvasXCoord = this.get( "canvasXCoord" );
	var canvasYCoord = this.get( "canvasYCoord" );
	var editXCoord = this.get( "editXCoord" );
	var editYCoord = this.get( "editYCoord" );
	var xCoord = ( canvasXCoord !== null && editXCoord !== null ) ? canvasXCoord + editXCoord : null;
	var yCoord = ( canvasYCoord !== null && editYCoord !== null ) ? canvasYCoord + editYCoord : null;
	console.log( "updateEditCoords", segmentId, "/", xCoord, yCoord, "/", canvasXCoord, canvasYCoord, "/", editXCoord, editYCoord );
	this.trigger( "updateEditCoords", segmentId, xCoord, yCoord );
};

TargetBoxState.prototype.focus = function() {
	this.viewTextarea.textarea[0][0].focus();
};
