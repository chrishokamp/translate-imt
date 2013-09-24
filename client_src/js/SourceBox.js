// Source textbox for PTM application
SourceBox = Backbone.Model.extend();

SourceBox.prototype.initialize = function(jsonCoreNLPFile, onChangeCallback, sourceQueryCallback, selectTranslationCallback) {
  this.jsonFileName = jsonCoreNLPFile;
  this.onChangeCallback = onChangeCallback;
  this.sourceQueryCallback = sourceQueryCallback;
  this.selectTranslationCallback = selectTranslationCallback;
  this.segments = {};
  this.curSegment = 0;

  this.ruleQueryCache = {};

  // Tooltip fields
  this.tooltipTimeout = undefined;
  this.selectedToken = undefined;
  
  // Source annotations
  this.chunkLists = {};
}

SourceBox.prototype.CSS_SEGMENT_CLASS = "SourceBox-segment";
SourceBox.prototype.CSS_TOKEN_CLASS = "SourceBox-token";
SourceBox.prototype.CSS_TOOLTIP_ID = "SourceBox-tooltip";
SourceBox.prototype.CSS_WORD_OPTION_CLASS = "SourceBox-option";

SourceBox.prototype.getSourceText = function() {
  return this.segments[this.curSegment];
};

SourceBox.prototype.getChunks = function() {
  return this.chunkLists[this.curSegment];
};

SourceBox.prototype.isChunk = function(start,end) {
  var chunkVector = this.chunkLists[this.curSegment];
  var span = [start,end];
  return span in chunkVector;
};

SourceBox.prototype.layoutCurrentWithTranslation = function(tgtText, alignments) {
  // TODO(spenceg): Alignments of source tokens with 1-best translations
};

SourceBox.prototype.handleSelect = function(event) {
  var segmentDiv = $(event.target);
  if (segmentDiv.attr('class') !== this.CSS_SEGMENT_CLASS) {
    // Ignore events on the token span
    segmentDiv = segmentDiv.parent();
  }
  segmentDiv.attr('src-select', 'T');
  this.curSegment = segmentDiv.attr('id');
  this.onChangeCallback();
};

SourceBox.prototype.closeTooltip = function(target) {
  // Reset state
  clearTimeout(this.tooltipTimeout);
  this.tooltipTimeout = undefined;
  this.selectedToken = undefined;

  // Close the tooltip
  $('#'+this.CSS_TOOLTIP_ID).css('display','none');
  // Deselect everything. Sometimes events don't fire. We know
  // that the tooltip is closed, so nothing should be selected.
  $('span.'+this.CSS_TOKEN_CLASS).attr('src-word-select','F');
};

SourceBox.prototype.openTooltip = function(options, event) {
  this.ruleQueryCache[event.target.id] = options;
  if (options.rules === undefined || options.rules.length === 0 ||
     event.target === this.selectedToken) {
    return;
  }
  this.selectedToken = event.target;

  // Populate the tooltip
  var tokDiv = $(event.target);
  var toolTip = $('#'+this.CSS_TOOLTIP_ID);
  toolTip.empty();
  var self = this;
  $.each(options.rules,function(i,val) {
    toolTip.append('<div class="' + self.CSS_WORD_OPTION_CLASS + '">' + val.tgt + '</div>');
  });

  // Callbacks over translation options
  $('div.'+this.CSS_WORD_OPTION_CLASS).hover(function(event) {
    $(event.target).attr('tgt-word-select', 'T');
  },function(event) {
    $(event.target).attr('tgt-word-select', 'F');
  }).click(function(event) {
    if (self.selectTranslationCallback) {
      var text = $(event.target).text();
      self.selectTranslationCallback(text);
    }
  });
  
  // Tooltip close
  toolTip.hover(function(event) {
    // Clear the mouseleave event from the token div
    clearTimeout(self.tooltipTimeout);
    self.tooltipTimeout = undefined;
  },function(event) {
    // Cursor has moved away from the tooltip
    clearTimeout(self.tooltipTimeout);
    self.tooltipTimeout = setTimeout(function() {self.closeTooltip(self.selectedToken)}, 1000);
  });

  // Position and open the tooltip
  var pos = tokDiv.position();
  toolTip.css("left", pos.left + (0.65*tokDiv.outerWidth()) + "px" )
    .css("top", pos.top + tokDiv.outerHeight() + "px" )
    .css( "display", "inline-block" );
};

SourceBox.prototype.makeChunkList = function(bitVector) {
  var left = -1;
  var chunkList = {};
  for (var i = 0; i < bitVector.length; i++) {
    if (left < 0 && bitVector[i] === true) {
      left = i;
    } else if (left >= 0 && bitVector[i] === false) {
      var span = [left,i-1];
      chunkList[span] = 1;
      left = -1;
    }
  }
  if (left >= 0) {
    var span = [left,i-1];
    chunkList[span] = 1;
  }
  return chunkList;
};


// TODO(spenceg): Prototype only. Clean this up
SourceBox.prototype.renderPOSBox = function() {
  var formStr = '<form id="pos-box"><input type="checkbox" value="N">Noun<input type="checkbox" value="V">Verb<input type="checkbox" value="A">Adjective<input type="checkbox" value="ADV">Adverb</form>';
  $('#debug-output').append(formStr);
  var self = this;
  $('#pos-box :checkbox').click(function() {
    var box = $(this);
    var pos = box.val();
    if (box.is(':checked')) {
      $("span[pos='" + pos + "-x']").attr('pos', pos); 
    } else {
      $("span[pos='" + pos + "']").attr('pos', pos + '-x'); 
    }
  });
};

SourceBox.prototype.render = function(targetDiv) {
  // Insert the options display box
  $('body').append('<div id="' + this.CSS_TOOLTIP_ID + '"></div>');

  // TODO(spenceg): Prototype
  this.renderPOSBox();
  
  // Load json from file and render in target box
  // Add event handlers for each div (for clicking)
  var self = this;
  var firstSegment = undefined;
  $.getJSON(this.jsonFileName, function(data) {
    $.each(data, function(i,val){
      var id = targetDiv + i;
      if (firstSegment === undefined) {
        firstSegment = id;
      }
      self.segments[id] = val.tokens.join(' ');
      self.chunkLists[id] = self.makeChunkList(val.isBaseNP);
      var divStr = '<div class="' + self.CSS_SEGMENT_CLASS + '" id="' + id + '">';
      $.each(val.tokens, function(j,tok) {
        var tokenId = id + "-" + j;
        var tokStr = '<span class="' + self.CSS_TOKEN_CLASS + '" id="' + tokenId + '" pos="' + val.pos[j] + '-x">' + tok + '</span> ';
        divStr += tokStr;
      });
      divStr += '</div>';
      $('#'+targetDiv).append(divStr);


	  $('#'+targetDiv).append("<div class='TypingUI TypingUI"+id+"' style='margin-bottom:20px; display: none; height: 0'></div>")
      if (i == 0) {
        $('#'+id).css('margin-top','0.5em');
      }
    });

    // Translation callback
    $('div.'+self.CSS_SEGMENT_CLASS).click(function(event) {
		self.handleSelect(event);
		d3.selectAll( ".TypingUI" ).style( "height", 0 ).style( "display", "none" );
		var elems = d3.selectAll( ".TypingUI" + self.curSegment ).style( "height", "80px" ).style( "display", null );
		elems = elems.selectAll( "textarea" );
		if ( ! elems.empty() ) {
			elems[0][0].focus();
		}
    });
    
    // Single-word query callback
    $('span.'+self.CSS_TOKEN_CLASS).hover(function(event) {
      if (event.target === self.selectedToken) {
        clearTimeout(self.tooltipTimeout);
        self.tooltipTimeout = undefined;
        return;
      } else {
        self.closeTooltip(self.selectedToken);
      }
      var targetDiv = $(event.target);
      targetDiv.attr('src-word-select', 'T');
      if (event.target.id in self.ruleQueryCache) {
        // Hit the cache
        self.openTooltip(self.ruleQueryCache[event.target.id], event);
      } else {
        // Hit the server
        self.sourceQueryCallback(targetDiv.text(), function(data) {
          self.openTooltip(data,event);
        });
      }
    }, function(event) {
      // Fires if cursor moves into space
      self.tooltipTimeout = setTimeout(function(){self.closeTooltip(event.target)}, 250);
    });

    // Set the first selected segment
    $('div#'+firstSegment).trigger('click');

	self.trigger( "initialized" );
  });
};

