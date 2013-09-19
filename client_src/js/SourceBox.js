// Source textbox for PTM application
function SourceBox(jsonFileName, onChangeCallback, sourceQueryCallback) {
  this.jsonFileName = jsonFileName;
  this.curSelection = null;
  this.onChangeCallback = onChangeCallback;
  this.sourceQueryCallback = sourceQueryCallback;
  this.segments = [];
  this.curSegment = 0;
}

SourceBox.prototype.CSS_SEGMENT_CLASS = "SourceBox-segment";
SourceBox.prototype.CSS_TOKEN_CLASS = "SourceBox-token";
SourceBox.prototype.CSS_TOOLTIP_ID = "SourceBox-tooltip";
SourceBox.prototype.CSS_WORD_OPTION_CLASS = "SourceBox-option";

// CSS elements here
SourceBox.prototype.AES_SEGMENT_SELECT = "#E8E8E8";
SourceBox.prototype.AES_WORD_SELECT = "#99CCFF";

SourceBox.prototype.getSourceText = function(event) {
  var srcText = this.segments[this.curSegment];
  return srcText;
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

SourceBox.prototype.render = function(targetDiv) {
  // Insert the options display box
  $('body').append('<div id="' + this.CSS_TOOLTIP_ID + '"></div>');

  // Load json from file and render in target box
  // Add event handlers for each div (for clicking)
  var self = this;
  $.getJSON(this.jsonFileName, function(data) {
    $.each(data.srclist, function(i,val){
      self.segments[i] = val;
      var id = targetDiv + "-" + i;
      var tokens = val.split(" ");      
      var divStr = '<div class="' + self.CSS_SEGMENT_CLASS + '" id="' + id + '">';
      $.each(tokens, function(j,tok) {
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
    $('.'+self.CSS_SEGMENT_CLASS).click(function(event) {
      self.handleSelect(event);
    });
    // Single-word query callback
    $('.'+self.CSS_TOKEN_CLASS).hover(function(event) {
      $(event.target).css('background-color', self.AES_WORD_SELECT);
      self.sourceQueryCallback($(event.target).text(),
                               event, self.renderSourceOptions.bind(self));
    },function(event) {
      self.closeSourceOptions(event);
    });
  });
};

