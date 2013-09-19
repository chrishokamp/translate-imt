// Source textbox for PTM application
function SourceBox(jsonCoreNLPFile, onChangeCallback, sourceQueryCallback) {
  this.jsonFileName = jsonCoreNLPFile;
  this.curSelection = null;
  this.onChangeCallback = onChangeCallback;
  this.sourceQueryCallback = sourceQueryCallback;
  this.segments = [];
  this.curSegment = 0;

  this.chunkLists = [];
}

SourceBox.prototype.CSS_SEGMENT_CLASS = "SourceBox-segment";
SourceBox.prototype.CSS_TOKEN_CLASS = "SourceBox-token";
SourceBox.prototype.CSS_TOOLTIP_ID = "SourceBox-tooltip";
SourceBox.prototype.CSS_WORD_OPTION_CLASS = "SourceBox-option";

// CSS elements here
SourceBox.prototype.AES_SEGMENT_SELECT = "#E8E8E8";
SourceBox.prototype.AES_WORD_SELECT = "#99CCFF";

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
    segmentDiv = $(event.target).parent();
  }
  segmentDiv.css('background-color', this.AES_SEGMENT_SELECT);
  if (this.curSelection) {
    var parColor = this.curSelection.parent().css('background-color');
    this.curSelection.css('background-color', parColor);
    this.curSelection.children().css('background-color', parColor);
  }
  this.curSelection = segmentDiv;
  this.curSegment = segmentDiv.attr('id').split('-')[1];
  this.onChangeCallback();
};

SourceBox.prototype.closeSourceOptions = function(event) {
  $('#'+this.CSS_TOOLTIP_ID).css('display','none');
  var parentColor = $(event.target).parent().css('background-color');
  $(event.target).css('background-color',parentColor);
};

SourceBox.prototype.renderSourceOptions = function(options, event) {
  if (options.rules === undefined || options.rules.length === 0) {
    return;
  }
  var tokDiv = $(event.target);
  var toolTip = $('#'+this.CSS_TOOLTIP_ID);
  toolTip.css("left", event.clientX + "px" )
    .css("top", event.clientY + "px" )
    .css( "display", "inline-block" );
  
  toolTip.empty();
  var self = this;
  $.each(options.rules,function(i,val) {
    toolTip.append('<div class="' + self.CSS_WORD_OPTION_CLASS + '">' + val.tgt + '</div>');
  });
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

SourceBox.prototype.render = function(targetDiv) {
  // Insert the options display box
  $('body').append('<div id="' + this.CSS_TOOLTIP_ID + '"></div>');

  // Load json from file and render in target box
  // Add event handlers for each div (for clicking)
  var self = this;
  $.getJSON(this.jsonFileName, function(data) {
    $.each(data, function(i,val){
      self.segments[i] = val.tokens.join(' ');
      self.chunkLists[i] = self.makeChunkList(val.isBaseNP);
      console.log(self.chunkLists[i]);
      var id = targetDiv + "-" + i;
      var divStr = '<div class="' + self.CSS_SEGMENT_CLASS + '" id="' + id + '">';
      $.each(val.tokens, function(j,tok) {
        var tokenId = id + "-" + j;
        var tokStr = '<span class="' + self.CSS_TOKEN_CLASS + '" id="' + tokenId + '">' + tok + '</span> ';
        divStr += tokStr;
      });
      divStr += '</div>';
      $('#' + targetDiv).append(divStr);
      if (i == 0) {
        $('#'+id).css('margin-top','0.5em');
      }
    });

    // Source selection callback
    $('div.'+self.CSS_SEGMENT_CLASS).click(function(event) {
      self.handleSelect(event);
    });
    // Single-word query callback
    $('span.'+self.CSS_TOKEN_CLASS).hover(function(event) {
      $(event.target).css('background-color', self.AES_WORD_SELECT);
      self.sourceQueryCallback($(event.target).text(),
                               event, self.renderSourceOptions.bind(self));
    },function(event) {
      self.closeSourceOptions(event);
    });
  });
};

