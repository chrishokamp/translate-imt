var TargetBoxState = Backbone.Model.extend({
	defaults : {
		// Initialized once by PTM
		"segmentId" : null,
		"chunkVector" : [],
		
		// States based on machine translations
		"prefix" : null,        // @value {string} Prefix used to generate the translations.
		"translationList" : [], // @value {string[][]} A list of translations. For each translation: a list of tokens represented as a string.
		"alignIndexList" : [],  // @value {Object[][]} For each translation: a list of objects {sourceIndex: number, targetIndex: number}.

		// States based on user inputs
		"caretIndex" : 0,
		"hasFocus" : false,

		// State based on user inputs both within and outside of TargetBox
		"userText" : "",
		
		"enableSuggestions" : true,
		"enableBestTranslation" : true,
		
		// Derived states
		"userTokens" : [ "" ],
		"editingPrefix" : "",
		"overlayPrefix" : "",
		"overlaySep" : "",
		"overlayEditing" : "",
		"prefixTokens" : [],
		"suggestionList" : [],
		"bestTranslation" : [],       // @value {string[]} A list of tokens in the best translation.
		"suggestions" : [],           // @value {string[]} A list of suggestions matching the current user's input
		"matchingTokens" : {},
		
		// States based on graphics rendering results
		"caretXCoord" : null,
		"caretYCoord" : null,
		"editXCoord" : null,
		"editYCoord" : null,
		"canvasXCoord" : null,
		"canvasYCoord" : null,
		"boxInnerHeight" : 0,
		"boxInnerWidth" : 0,
		"boxHeight" : 0,
		"boxWidth" : 0
	}
});

TargetBoxState.prototype.WIDTH = 775;
TargetBoxState.prototype.MIN_HEIGHT = 50;
TargetBoxState.prototype.ANIMATION_DELAY = 180;
TargetBoxState.prototype.ANIMATION_DURATION = 120;
TargetBoxState.prototype.IMMEDIATELY = 5;  // milliseconds

TargetBoxState.prototype.WHITESPACE = /[ ]+/g;
TargetBoxState.prototype.WHITESPACE_SEPS = /([ ]+)/g;

TargetBoxState.prototype.initialize = function( options ) {
	var segmentId = options.segmentId;
	this.view = new TargetBoxView({ "model" : this, "el" : ".TargetBoxView" + segmentId, "segmentId" : segmentId });
	this.viewTextarea = new TargetTextareaView({ "model" : this, "el" : ".TargetTextareaView" + segmentId });
	this.viewOverlay = new TargetOverlayView({ "model" : this, "el" : ".TargetOverlayView" + segmentId });
	this.updateSuggestionList = this.__updateSuggestionList; //_.debounce( this.__updateSuggestionList, this.IMMEDIATELY );
	this.updateBestTranslation = this.__updateBestTranslation; //_.debounce( this.__updateBestTranslation, this.IMMEDIATELY );
	this.updateSuggestions = this.__updateSuggestions; //_.debounce( this.__updateSuggestions, this.IMMEDIATELY );
	this.updateMatchingTokens = this.__updateMatchingTokens; //_.debounce( this.__updateMatchingTokens, this.IMMEDIATELY );
	this.on( "change:prefix change:translationList", this.updatePrefixTokensAndSuggestionList );
	this.on( "change:userText change:prefixTokens", this.updateUserTokens );
	this.on( "change:editingPrefix", this.updateTranslations );
	this.on( "change:userTokens change:translationList change:enableBestTranslation", this.updateBestTranslation );
	this.on( "change:userTokens change:suggestionList change:bestTranslation change:caretIndex change:enableSuggestions", this.updateSuggestions );
	this.on( "change:userTokens change:alignIndexList change:enableBestTranslation", this.updateMatchingTokens );
//	this.on( "change:caretIndex", this.triggerUpdateCaretIndex );
	this.on( "change:editXCoord change:editYCoord", this.updateEditCoords );
	this.on( "change:boxWidth change:boxHeight", this.updateBoxDims );
};

TargetBoxState.prototype.updatePrefixTokensAndSuggestionList = function() {
	var prefix = this.get( "prefix" );
	var prefixTokens = prefix.split( this.WHITESPACE );
	var prefixLength = ( prefix === "" ) ? 0 : prefixTokens.length;

	var targetTokenIndex = prefixLength;
	var translationList = this.get( "translationList" ); // prefix is always updated whenever translationList or alignIndexList
	var alignIndexList = this.get( "alignIndexList" );   // is updated, and therefore trigger on change:prefix only.
	var chunkVector = this.get( "chunkVector" );       // chunkVector is never changed after initialization.
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
		for ( var sourceTokenIndex = 0; sourceTokenIndex < chunkVector.length; sourceTokenIndex++ ) {
			var chunkIndex = chunkVector[ sourceTokenIndex ];
			if ( sourceTokenIndexes.hasOwnProperty( sourceTokenIndex ) ) {
				currentChunkIndexes[ chunkIndex ] = true;
			}
		}

		// Expand to include all source tokens that are belong to the same chunk indexes
		var currentSourceTokenIndexes = {};
		for ( var sourceTokenIndex = 0; sourceTokenIndex < chunkVector.length; sourceTokenIndex++ ) {
			var chunkIndex = chunkVector[ sourceTokenIndex ];
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
		"prefixLength" : prefixLength,
		"suggestionList" : suggestionList
	});
};

TargetBoxState.prototype.updateUserTokens = function() {
	var userText = this.get( "userText" );
	var userTokens = userText.split( this.WHITESPACE );
	var userTokensAndSeps = userText.split( this.WHITESPACE_SEPS );
	var userLength = ( userText === "" ) ? 0 : userTokens.length;
	var prefixLength = this.get( "prefixLength" );
	
	var editingPrefix = "";
	var overlayPrefix = userText;
	var overlaySep = "";
	var overlayEditing = "";
	if ( userLength === 0 ) {
		overlayPrefix = "";
		overlaySep = "";
		overlayEditing = ""
	}
	else if ( prefixLength === 0 ) {
		overlayPrefix = "";
		overlaySep = "";
		overlayEditing = userText;
	}
	else if ( userLength > prefixLength ) {
		overlayPrefix = userTokensAndSeps.slice( 0, prefixLength*2-1 ).join("");
		overlaySep = userTokensAndSeps[ prefixLength*2-1 ];
		overlayEditing = userTokensAndSeps.slice( prefixLength*2 ).join("");
	}
	if ( userLength > 1 ) {
		editingPrefix = userTokensAndSeps.slice( 0, userTokensAndSeps.length-2 ).join("");
	}
	this.set({
		"userTokens" : userTokens,
		"userLength" : userLength,
		"editingPrefix" : editingPrefix,
		"overlayPrefix" : overlayPrefix,
		"overlaySep" : overlaySep,
		"overlayEditing" : overlayEditing
	});
};

TargetBoxState.prototype.updateTranslations = function() {
	var segmentId = this.get( "segmentId" );
	var editingPrefix = this.get( "editingPrefix" );
	this.trigger( "updateTranslations", segmentId, editingPrefix );
};

TargetBoxState.prototype.__updateBestTranslation = function() {
	var bestTranslation = [];
//	if ( this.get( "enableBestTranslation" ) === true ) {
		var userTokens = this.get( "userTokens" );
		var userToken = userTokens[ userTokens.length - 1 ];

		var translationList = this.get( "translationList" );
		var translationIndex = 0;
		if ( translationList.length > translationIndex ) {
			var mtTokens = translationList[translationIndex];
			if ( mtTokens.length >= userTokens.length ) {
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
//	}
	this.set( "bestTranslation", bestTranslation );
};

TargetBoxState.prototype.__updateSuggestions = function() {
	var suggestions = [];
	if ( this.get( "enableSuggestions" ) === true ) {
		var prefix = this.get( "prefix" );
		var caretIndex = this.get( "caretIndex" );
		var bestTranslation = this.get( "bestTranslation" );

		// Only show suggestions if caret is in the first word following the prefix
		// Lowerbound: Must be longer than prefix
		if ( caretIndex > prefix.length || prefix.length === 0 ) {

			// Only show suggestions if we've not yet reached the end of the best translation
			if ( bestTranslation.length > 0 ) {

				// Upperbound: Matching all characters following the prefix
				var userText = this.get( "userText" );
				var editingText = userText.substr( prefix.length ).trimLeft();
				var suggestionList = this.get( "suggestionList" );
				for ( var suggestionIndex = 0; suggestionIndex < suggestionList.length; suggestionIndex++ ) {
					var suggestion = suggestionList[suggestionIndex];
					if ( suggestion.substr( 0, editingText.length ) === editingText && suggestion.length > editingText.length ) {
						suggestions.push( suggestion );
					}
				}
			}
		}
	}
	this.set( "suggestions", suggestions );
	this.trigger( "updateSuggestions", this.get( "segmentId" ), suggestions );
};

TargetBoxState.prototype.__updateMatchingTokens = function() {
	var matchingTokens = {};
	if ( this.get( "enableBestTranslation" ) === true ) {
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
	}
	this.set( "matchingTokens", matchingTokens );
	this.trigger( "updateMatchingTokens", this.get( "segmentId" ), matchingTokens );
};

TargetBoxState.prototype.replaceEditingToken = function( text ) {
	var editingPrefix = this.get( "editingPrefix" );
	var userText = ( editingPrefix === "" ? "" : editingPrefix + " " ) + ( text === "" ? "" : text + " " );
	this.set( "userText", userText );
};

TargetBoxState.prototype.updateFocus = function() {
	var segmentId = this.get( "segmentId" );
	this.trigger( "updateFocus", segmentId );
};

TargetBoxState.prototype.updateEditCoords = function() {
	var segmentId = this.get( "segmentId" );
	this.trigger( "updateEditCoords", segmentId );
};

TargetBoxState.prototype.updateBoxDims = function() {
	var segmentId = this.get( "segmentId" );
	this.trigger( "updateBoxDims", segmentId );
};

TargetBoxState.prototype.focus = function() {
	var caretIndex = this.viewTextarea.textarea[0][0].value.length
	this.viewTextarea.textarea[0][0].selectionStart = caretIndex;
	this.viewTextarea.textarea[0][0].selectionEnd = caretIndex;
	this.viewTextarea.textarea[0][0].focus();
	this.set({
		"hasFocus" : true,
		"caretIndex" : caretIndex
	});
};
