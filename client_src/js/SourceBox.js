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
  segmentDiv.css('background-color','#E8E8E8');
  if (this.curSelection) {
    this.curSelection.css('background-color','#FFFFFF');
  }
  this.curSelection = segmentDiv;
  this.curSegment = segmentDiv.attr('id').split('-')[1];
  this.onChangeCallback();
};

SourceBox.prototype.closeSourceOptions = function(event) {
  var parentColor = $(event.target).parent().css('background-color');
  $(event.target).css('background-color',parentColor);
};

SourceBox.prototype.renderSourceOptions = function(options, event) {
  var div = $('#debug-output');
  div.empty();
  // TODO(spenceg): Render a box near the source span
  $.each(options.rules,function(i,val) {
    div.append('<p>' + val.tgt + '</p>');
  });

  $(event.target).css('background-color','#99CCFF');
  
  var self = this;
  $(event.target).mouseout(function(event){
    self.closeSourceOptions(event);
  });
};

SourceBox.prototype.handleSourceQuery = function(event) {
  var word = $(event.target).text();
  console.log(word);
  this.sourceQueryCallback(word, event, this.renderSourceOptions.bind(this));
};

SourceBox.prototype.render = function(targetDiv) {
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
    $('.'+self.CSS_TOKEN_CLASS).mouseover(function(event) {
      self.handleSourceQuery(event);
    });
  });
};

