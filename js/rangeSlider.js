/**
    @author Milos Veljkovic
    @description jQuery plugin that creates a range slider that can easily be used with event based framework, backbone.js or such
    @version 1.0
    @requires jQuery, modernizr
    @example $(elem).rangeSlider({
        'maxVal': 100,
        'minVal': 0,
        'maxLimit': 100,
        'minLimit': 0,
        'step': 0,
        'filterName': '',
        'events': {
            'onChange': 'onChange.ccv',
            'filterUpdate': 'filterUpdate.ccv',
            'resetFilter': 'resetFilter.ccv'
        },
        'numberFormat': '',
        'unit': '',
        'isDisabled': false
    });
*/
/**
    @rangeSlider
*/

//create namespace 
var RS = window.RS || {};

RS.rangeSlider = (function($, window, document, undefined) {
    'use strict';
    // Create the defaults
    var pluginName = 'rangeSlider',
        defaults = {
            'maxVal': 100,
            'minVal': 0,
            'maxLimit': 100, //Max limit, cannot be larger than maxVal and smaller than minLimit
            'minLimit': 0, //Min Limit, cannot be smaller than minVal and larger than MaxLimit
            'step': 0,
            'filterName': '',
            'events': {
                'onChange': 'onChange.rs',
                'filterUpdate': 'filterUpdate.rs',
                'resetFilter': 'resetFilter.rs'
            },
            'numberFormat': '',
            'unit': '',
            'isDisabled': false //disabled if true and enabled if false
        },
        prvt = { //private variables that will be used inside of the function
            'handleMax': {},
            'handleMin': {},
            'maxLabel': {},
            'minLabel': {},
            'sliderBar': {},
            'sliderBarBack': {},
            'sliderRange': {},
            'isDragging': false,
            'draggingElem': {},
            'mouseX': 0,
            'elemOffset': '',
            'unitsPerPixel': 0,
            'handleWidth': 0,
            'currentMin': 0,
            'currentMax': 0,
            'sliderBarWidth': 0,
            'intervalBlock': 0,
            'innerOffset': 0,
            'isTouchable': false,
            'eventNames':{
                'mouseDown': 'mousedown',
                'mouseMove': 'mousemove',
                'mouseUp': 'mouseup',
                'click': 'click'
            }
        };
        
    //element setup
    function sliderSetup(that) {
        
        //setup variables
        var $elem = $(that.element),
            minMaxVal,
            backSliderBarWidth;
            
        //check if we are working with a touch capable device
        that._prvt.isTouchable = checkTouch(that);
        
        //setup the filtername and other values
        if (!that.options.filterName) {
            that.options.filterName = $elem.data('filter-name');
        }
        
        //setup unit
        if (!that.options.unit) {
            that.options.unit = $elem.data('unit');
        }
        
        //find number format value
        if (!that.options.numberFormat) {
            that.options.numberFormat = $elem.data('number-format');
        }
        
        //get the step value
        if (that.options.step === 0 || !that.options.step) {
            that.options.step = $elem.data('step');
        }
        
        //setup initial values for current min and max
        that._prvt.currentMin = that.options.minLimit;
        that._prvt.currentMax = that.options.maxLimit;
        
        //bind a custom event to bind the slider
        $elem.bind(that.options.events.filterUpdate, function(evt, obj) {
            //call update sider to update slider positions
            updateSlider(obj[that.options.filterName], that);
        });
        
        //bind a custom event to reset the slider
        $elem.bind(that.options.events.resetFilter, function(evt, obj) {
            //call the reset slider function 
            resetSlider(that);
        });
        
        //setup an object for min max val
        minMaxVal = formatLabels(that);
        
        //setup dom elements
        that._prvt.handleMax = $('<span/>', {
            'html': 'handleMax',
            'class': 'handleMax handle'
        });
        
        //maximum handle
        that._prvt.handleMin = $('<span/>', {
            'html': 'handleMin',
            'class': 'handleMin handle'
        });
        
        //label for maximum 
        that._prvt.maxLabel = $('<span/>', {
            'class': 'max',
            'html': minMaxVal.maxVal
        });
        
        //compose the minimum label
        that._prvt.minLabel = $('<span/>', {
            'class': 'min',
            'html': minMaxVal.minVal
        });
        
        //this is a darker slider bar that shows up on top and significates a range
        that._prvt.sliderBar = $('<div/>', {
            'class': 'sliderBar'
        });
        
        //create slider range element
        that._prvt.sliderRange = $('<div/>', {
            'class': 'sliderRange'
        });
        
        //this is the slider back that never changes size but shows up under the regular slider bar
        that._prvt.sliderBarBack = $('<div/>', {
            'class': 'sliderBarBack'
        });
        
        //append items to the sliderBar that is the limiter
        //add spans that show min max
        that._prvt.sliderBar.append(that._prvt.sliderRange, that._prvt.handleMin, that._prvt.handleMax);
        
        //append elements to the element in question
        $elem.append(that._prvt.sliderBarBack, that._prvt.sliderBar, that._prvt.maxLabel, that._prvt.minLabel);
        
        //remove loading image 
        $elem.removeClass('loading');
        
        //setup some constants
        //offset constant
        that._prvt.elemOffset = $elem[0].offsetLeft + that._prvt.sliderBar[0].offsetLeft;
        
        //setup element width on the handles
        that._prvt.handleWidth = parseInt($(that._prvt.handleMin).css('width'), 10);
        
        //Width of the slider bar minus the bar handleWidth so that the element we can center the handles
        that._prvt.sliderBarWidth = parseInt(that._prvt.sliderBar.css('width'), 10);// - that._prvt.handleWidth;
        
        //calculate for use in this function
        backSliderBarWidth = parseInt(that._prvt.sliderBarBack.css('width'), 10) - that._prvt.handleWidth;
        
        //units per Pixel 
        that._prvt.unitsPerPixel = (that.options.maxVal - that.options.minVal) / (backSliderBarWidth); // - that._prvt.handleWidth
        
        //interval block size
        that._prvt.intervalBlock = (backSliderBarWidth) / ((that.options.maxVal - that.options.minVal) / that.options.step); // - that._prvt.handleWidth
        
        //setup listeners
        $elem.on(that._prvt.eventNames.mouseDown, '.handle', function(e) {
            
            //variables
            var $body = $('body'),
                $this = $(this);
            
            //update the mouse position not to get the jump of the element
            dragGo(e, that);
            
            //set the drag flag to true
            that._prvt.isDragging = true;
            
            //set element to e.currentTarget
            that._prvt.draggingElem = e.currentTarget;
            
            //call animate function
            animator(that);
            
            //if touch event setup the event to stop scrolling of all the elements
            if (that._prvt.isTouchable){
            
                //delegate event for touch move events
                
                //stop body from moving so that we can make the move on the scroller handle
                $body.on('touchmove._RangeSlider', function(e) {
                
                  //prevent default so that we can move the slider
                  e.preventDefault();
                
                });
                
                //mouse up on the body 
                $body.on(that._prvt.eventNames.mouseUp+'._RangeSlider', that, dragStop);
                
                $this.on(that._prvt.eventNames.mouseMove+'._RangeSlider', that, dragGo);
            }else{
            
                //setup a custom events and bind them to the body
                
                //mouse up event that stops all the movemenet also set on the body
                $body.on(that._prvt.eventNames.mouseUp+'._RangeSlider', that, dragStop);
                
                //mouse move event that updates the positon of the mouse 
                $body.on(that._prvt.eventNames.mouseMove+'._RangeSlider', that, dragGo);
            }
            
            //turn off all the events
            $elem.off('click.RS_', '.sliderBar');
            
            //prevent defaults
            return false;
            
        }).on('click', '.handle', function(e){
            return false;
        });
        //
        $elem.on('click.RS_', '.sliderBar', that, onClickUpdate); //onClickUpdate

        //mouse up stop dragging
        $(window).resize(that, adjustOffset);
    }
    //check for the touch capable device
    function checkTouch(that){
        
       //check if html has class touch 
       //depends on Modernizr setting a class
       
       if($('html').hasClass('touch')){
       
           //map the touch events
           that._prvt.eventNames.mouseDown = 'touchstart';
           that._prvt.eventNames.mouseMove = 'touchmove';
           that._prvt.eventNames.mouseUp = 'touchend';
           return true;
       
       }else{
       
            //leave default events
           return false;
       }
    }

    //format labels
    function formatLabels(that) {
        var minVal, 
            maxVal, 
            unit = that.options.unit ? ' ' + that.options.unit : '';
        
        //immediately call the function to update number format
        if (that.options.numberFormat === 'number') {
            
            //call a function to format a number
            minVal = formatAsNumber(that._prvt.currentMin) + unit;
            maxVal = formatAsNumber(that._prvt.currentMax) + unit;
        
        } else if (that.options.numberFormat === 'currency') {
            
            //setup the currency
            minVal = '$' + formatAsNumber(that._prvt.currentMin);
            maxVal = '$' + formatAsNumber(that._prvt.currentMax);
        
        } else {
            
            minVal = that._prvt.currentMin + unit;
            maxVal = that._prvt.currentMax + unit;
        }
        
        //return an object with min and max values
        return {
            'minVal': minVal,
            'maxVal': maxVal
        };
    }

    //utility function for translating unit data into pixel data
    //this should be useful when receiving updated values from the event

    function unitsToPixels(that, unitValue) {
        
        //interval block multiplied by the passed unit value subtracted by minimum value divided by the step
        var pixelValue = parseInt(that._prvt.intervalBlock * ((unitValue - that.options.minVal) / that.options.step)*100, 10)/100;
        
        return pixelValue;
    }
    
    //function to replace annonymus function on the bar click
    function onClickUpdate(e) {
        var maxPos, 
            minPos, 
            that = e.data,
            clickPos = e.pageX - that._prvt.elemOffset,
            labelsVal,
            stepMod,
            modCalc,
            currVal;
            //update page X value
        
        //execute only if not dragging
        if (!that._prvt.isDragging && !that.options.isDisabled) {
            
            //normalize edge case where user can click on the value that is larger than max
            if(unitsToPixels(that, that.options.maxLimit)<clickPos){
                clickPos = unitsToPixels(that, that.options.maxLimit)+(that._prvt.handleWidth/2);
            }
            if((unitsToPixels(that, that.options.minLimit)+(that._prvt.handleWidth/2))>clickPos){
                clickPos = unitsToPixels(that, that.options.minLimit)+(that._prvt.handleWidth/2);
            }
            
            //step mod has the value 
            stepMod = that.options.minVal + ((clickPos - (that._prvt.handleWidth / 2)) * that._prvt.unitsPerPixel);
        
            //calculate the base mod value and use it to calculate the rest of the values
            modCalc = stepMod % that.options.step;
            
            //check of there is a step defined
            if (that.options.step > 0) {
                
                if (modCalc < (that.options.step / 2)) {
                    
                    //set current value
                    currVal = stepMod - modCalc;
                    clickPos = unitsToPixels(that, currVal) - that._prvt.innerOffset;
                
                } else {
                
                    //set curr value
                    currVal = (stepMod - modCalc) + that.options.step;
                    clickPos = unitsToPixels(that, currVal) - that._prvt.innerOffset;
                    
                }
                //
            }
            
            //check for the edge case scenario
            if (currVal > that.options.maxLimit){
                currVal = that.options.maxLimit;
            }
            
            if(currVal < that.options.minLimit){
                currVal = that.options.minLimit;
            }
            
            if (that._prvt.handleMax.css('left') === 'auto') {
                
                //check if this vaule needs to be updated on reset function
                maxPos = that._prvt.sliderBarWidth;
            } else {
                
                //get the max position
                maxPos = unitsToPixels(that, that._prvt.currentMax);
            }
            //
            minPos = unitsToPixels(that, that._prvt.currentMin);
            
            //check for the closer one
            //adjust the currentMax and currentMin
            //convert the clickPos to a step 
            
            //
            if (((maxPos - that._prvt.innerOffset) - clickPos) < (clickPos - (minPos-that._prvt.innerOffset))) {
              
                //animate max to the position
                that._prvt.handleMax.animate({
                    'left': clickPos + 'px'
                }, 30);
                
                //animate sliderRange element
                that._prvt.sliderRange.animate({
                    'width': (clickPos - (unitsToPixels(that, that._prvt.currentMin) - unitsToPixels(that, that.options.minLimit))) + (that._prvt.handleWidth / 2)+'px'
                }, 30);
                
                
                //update value
                that._prvt.currentMax = currVal;
                //
                //that._prvt.draggingElem = that._prvt.handleMax;
            
            } else {
                
                //animate element to the postion
                that._prvt.handleMin.animate({
                    'left': clickPos + 'px'
                }, 30);
                
                //animate sliderRange element
                that._prvt.sliderRange.animate({
                    'left': clickPos + 'px',
                    'width': (unitsToPixels(that , that._prvt.currentMax) - unitsToPixels(that, currVal))+(that._prvt.handleWidth / 2)+'px'
                }, 30);
            
                
                //update value
                that._prvt.currentMin = currVal;
            }
            
            //update labels
            labelsVal = formatLabels(that);
            
            //update maxLabel
            that._prvt.maxLabel.html(labelsVal.maxVal);
            
            //update minLabel
            that._prvt.minLabel.html(labelsVal.minVal);
            
            //dispach and event
            //trigger a custom event that updates backbone.js or any other listener
            $(that.element).trigger(that.options.events.onChange, {
                'name': that.options.filterName,
                'currentMin': that._prvt.currentMin,
                'currentMax': that._prvt.currentMax
            });
        }
        
        //prevent default
        return false;
    }
    
    //function that will adjust offset if screen is resized
    function adjustOffset(e) {
        e.data._prvt.elemOffset = e.data.element.offsetLeft + e.data._prvt.sliderBarBack[0].offsetLeft;
    }
    
    //function to update filters
    function updateSlider(obj, that) {
        var currMinPixel, 
            currMaxPixel, 
            leftCss, 
            labelsVal;

        //check if our object is an object
        if (typeof obj !== 'undefined') {
            if (!obj.state) {
                
                //call disabled sliders
                that.options.isDisabled = true;
                //
                disableSlider(that);
                
            } else {
                
                //switch the flag for dsiabled slider
                that.options.isDisabled = false;
                
                //remove disabled class
                $(that.element).removeClass('disabled');
                
                //setup all the local variables 
                that._prvt.currentMin = obj.min;
                that._prvt.currentMax = obj.max;
                
                //setup the Limit Values
                that.options.minLimit = obj.min;
                that.options.maxLimit = obj.max;
                
                //add values
                currMinPixel = unitsToPixels(that, that._prvt.currentMin);
                currMaxPixel = unitsToPixels(that, that._prvt.currentMax);
                
                //get the CSS property value
                leftCss = parseInt(that._prvt.sliderBarBack.css('left'), 10);
                
                //adjust current offset value
                that._prvt.innerOffset = currMinPixel;
                
                //this will reset the intenal values to what they need to be
                that._prvt.sliderBar.animate({ 
                    //setup the width and position of this based on the values that are passed in
                    'left': currMinPixel + leftCss,
                    'width': currMaxPixel - currMinPixel + that._prvt.handleWidth + 'px'
                }, 500);
                
                //animate slider range color
                that._prvt.sliderRange.animate({ 
                    //setup the width and position of this based on the values that are passed in
                    'left': 0,
                    'width': (currMaxPixel - currMinPixel) + (that._prvt.handleWidth / 2) + 'px'
                }, 500);
                
                //adjust values and slider position
                that._prvt.handleMax.animate({
                    'left': currMaxPixel - currMinPixel
                }, 400);
                
                //update min
                that._prvt.handleMin.animate({
                    'left': currMinPixel - currMinPixel
                }, 400);
                
                //update labels
                labelsVal = formatLabels(that);
                that._prvt.maxLabel.html(labelsVal.maxVal);
                that._prvt.minLabel.html(labelsVal.minVal);
                
                //run a funciton that checks for values and makes items hidden if they need to be
                checkMinMaxValues(that);
            }
        }
    }
    
    //Check minimum and maximum values and if they are the same
    function checkMinMaxValues(that){
        //make the values move
        if(that._prvt.currentMax === that._prvt.currentMin){
            //make the items hidden
            that._prvt.maxLabel.hide();
            that._prvt.handleMin.hide();
        }else{
            that._prvt.maxLabel.show();
            that._prvt.handleMin.show();
        }
    }
    
    //reset slider function 
    function resetSlider(that) {
        var labelsVal;
        
        //move sliders to the max
        //move handle bars 
        that._prvt.sliderBar.animate({
            'left': that._prvt.sliderBarBack.css('left'),
            'width': that._prvt.sliderBarBack.css('width')
        }, 500);
        
        //animate slider range color
        that._prvt.sliderRange.animate({ 
            //setup the width and position of this based on the values that are passed in
            'left': 0,
            'width': that._prvt.sliderBarBack.css('width')
        }, 500);

        //remove disabled stuff
        that.options.isDisabled = false;
        $(that.element).removeClass('disabled');
        
        //set the current values and limits to the max values
        that.options.maxLimit = that.options.maxVal;
        that.options.minLimit = that.options.minVal;
        
        //setup current values
        that._prvt.currentMin = that.options.minVal;
        that._prvt.currentMax = that.options.maxVal;
        
        //move sliders to initial position
        that._prvt.handleMax.animate({
            'left': unitsToPixels(that, that._prvt.currentMax)
        });
        
        //animate slider to initial position 
        that._prvt.handleMin.animate({
            'left': unitsToPixels(that, that._prvt.currentMin)
        });
        
        //update labels
        labelsVal = formatLabels(that);
        that._prvt.maxLabel.html(labelsVal.maxVal);
        that._prvt.minLabel.html(labelsVal.minVal);
        
        //get the inner offset reset
        that._prvt.innerOffset = 0;
        
        //
        checkMinMaxValues(that);
    }
    
    //setup a function that will fire a custom event
    function dragStop(e) {
        
        //setup variables
        var that = e.data,
            sliderMoveVal,
            trackingSlider = '';
        
        ///check if our slider is disabled
        if (!that.options.isDisabled) {
            
            //check if there is a step option
            if (that.options.step > 0) {
                
                //take the dragging element and move to the postion that you need
                if ($(that._prvt.draggingElem)[0] === that._prvt.handleMax[0]) {
                
                    //calculate the value
                    if(that._prvt.currentMax > that.options.maxLimit){
                        that._prvt.currentMax = that.options.maxLimit;
                    }
                    
                    //
                    sliderMoveVal = unitsToPixels(that , that._prvt.currentMax) - that._prvt.innerOffset;
                    
                    //tracking value to add
                    trackingSlider = '_max';
                } else {
                    //out

                    //check if the slider went lower than it should
                    if(that._prvt.currentMin < that.options.minLimit){
                        
                        that._prvt.currentMin = that.options.minLimit;
                    }
                    
                    //calculate value
                    sliderMoveVal = unitsToPixels(that , that._prvt.currentMin) - that._prvt.innerOffset;
                    
                    //tracking value to add
                    trackingSlider = '_min';
                }
                
                //animate slider
                $(that._prvt.draggingElem).animate({
                    'left': sliderMoveVal + 'px'
                }, 30);
                
                //adjust the sliderRange element
                $(that._prvt.sliderRange).animate({
                    'left': unitsToPixels(that , that._prvt.currentMin) - that._prvt.innerOffset+'px',
                    'width': (unitsToPixels(that , that._prvt.currentMax) - unitsToPixels(that , that._prvt.currentMin))+(that._prvt.handleWidth / 2)+'px'
                }, 30);
            }
            
            //remove custom events
            $('body').off('._RangeSlider'); //dragStop
            
            //set a flag for dragging
            that._prvt.isDragging = false;
            
            //trigger a custom event that updates backbone.js or any other listener
            $(that.element).trigger(that.options.events.onChange, {
                'name': that.options.filterName,
                'currentMin': that._prvt.currentMin,
                'currentMax': that._prvt.currentMax
            });

            //bring back the click on the bar
            $(e.data.element).on('click._RangeSlider', '.sliderBar', that, onClickUpdate); //onClickUpdate

        }
        e.preventDefault();
        e.stopPropagation();
    }
    
    //dragGo gives us the mouse position on the page
    function dragGo(e, that) {
        
        //check where the event is comming from
        if(typeof that === 'undefined'){
            that = e.data;
        }
        
        //if it is a touch event make it work as a touch
        if(that._prvt.isTouchable){
           
           that._prvt.mouseX = e.originalEvent.targetTouches[0].pageX; 
        }else{
            
            //if the usual way just get the pageX
            that._prvt.mouseX = e.pageX;
        }
        //prevent default
        e.preventDefault();
    }
    
    //disable slider
    function disableSlider(that) {
        
        //this will add a .disabled class to the element 
        $(that.element).addClass('disabled');
        
        //also create a switch that will disable all the functionality in the slider
        that.options.isDisabled = true;
    }
    
    //move slider function
    function moveSlider(that) {
        
        //take these out so you have to get them only once
        var posX = that._prvt.mouseX - that._prvt.elemOffset,
            stepMod, 
            labelsVal, 
            modCalc,
            stepOffset,
            modOffset;
        
        //setup value of stepOffset
        if ((that._prvt.handleWidth*that._prvt.unitsPerPixel)>that.options.step){
            
            //
            modOffset = parseInt(that._prvt.handleWidth*that._prvt.unitsPerPixel, 10) % that.options.step;
            
            if (modOffset === 0){
                //
                stepOffset = parseInt(that._prvt.handleWidth*that._prvt.unitsPerPixel, 10);
            
            }else{
                //
                stepOffset = parseInt(that._prvt.handleWidth*that._prvt.unitsPerPixel, 10) - modOffset + that.options.step;
            
            }
        }else{
            stepOffset = that.options.step;
        }
        
        //call the unitsToPixels function here
        if (that._prvt.isDragging && posX >= (unitsToPixels(that, that.options.minLimit)) && posX <= (unitsToPixels(that, that.options.maxLimit)+that._prvt.handleWidth) && !that.options.isDisabled) {
            
            //step mod has the value 
            stepMod = that.options.minVal + ((posX - (that._prvt.handleWidth / 2)) * that._prvt.unitsPerPixel);
            
            //calculate the base mod value and use it to calculate the rest of the values
            modCalc = stepMod % that.options.step;
            
            //check what is the element being dragged
            if ($(that._prvt.draggingElem)[0] === that._prvt.handleMax[0]) {
                
                //check if value is within the bounds
                if (that._prvt.currentMax > that._prvt.currentMin) {
                    //move sliders
                    $(that._prvt.draggingElem).css({
                        'left': (posX - (that._prvt.handleWidth / 2)) - that._prvt.innerOffset+'px'
                    });
                    
                    //adjust the width of the sliderRange element
                    $(that._prvt.sliderRange).css({
                        'width': (posX - (that._prvt.handleWidth / 2)) - unitsToPixels(that, that._prvt.currentMin) + (that._prvt.handleWidth / 2) + 'px'
                    });
                    
                    //adjust this value to always be the step value
                    if (that.options.step > 0) {
                        
                        if (modCalc < (that.options.step / 2)) {
                            //
                            that._prvt.currentMax = stepMod - modCalc;
                        } else {
                            //
                            that._prvt.currentMax = (stepMod - modCalc) + that.options.step;
                        }
                        //
                    } else {
                        that._prvt.currentMax = that.options.minVal + (~~ ((posX - (that._prvt.handleWidth / 2)) * that._prvt.unitsPerPixel));
                    }
                    
                    //check if you are hitting other slider
                    if(that._prvt.currentMax <= that._prvt.currentMin){
                        that._prvt.currentMax = that._prvt.currentMin + stepOffset;
                    }
                    
                    //check if you are hitting the step edge case where step is five and numbers left are less than 5
                    if((that._prvt.currentMax + stepOffset)>that.options.maxLimit){
                        that._prvt.currentMax=that.options.maxLimit;
                    }
                    
                    //update values
                    labelsVal = formatLabels(that);
                    that._prvt.maxLabel.html(labelsVal.maxVal);
                }
            } else {
            
                if (that._prvt.currentMax > that._prvt.currentMin) {
                    
                    //move sliders
                    $(that._prvt.draggingElem).css({
                        'left': (posX - (that._prvt.handleWidth / 2) - that._prvt.innerOffset) +'px'
                    });
                    
                    //adjust the width of the sliderRange element
                    $(that._prvt.sliderRange).css({
                        'width': (unitsToPixels(that, that._prvt.currentMax)+(that._prvt.handleWidth / 2)) - posX + 'px',
                        'left' : (posX - that._prvt.innerOffset) +'px'
                    });
                    
                    if (that.options.step > 0) {

                        if (modCalc < (that.options.step / 2)) {
                            //
                            that._prvt.currentMin = stepMod - modCalc;
                        } else {
                            //
                            that._prvt.currentMin = (stepMod - modCalc) + that.options.step;
                        }
                        
                        //
                        if(that._prvt.currentMax <= that._prvt.currentMin){

                            that._prvt.currentMin = that._prvt.currentMax - stepOffset;

                        }
                        
                        //check if you are hitting the step edge case where step is five and numbers left are less than 5
                        if((that._prvt.currentMin - stepOffset)<that.options.minLimit){

                            that._prvt.currentMin=that.options.minLimit;

                        }

                    } else {
                        
                        that._prvt.currentMin = that.options.minVal + (~~((posX - (that._prvt.handleWidth / 2)) * that._prvt.unitsPerPixel));
                        //
                        if(that._prvt.currentMax <= that._prvt.currentMin){

                            that._prvt.currentMin = that._prvt.currentMax - (that._prvt.handleWidth*that._prvt.unitsPerPixel);

                        }

                    }
                    
                    
                    //update labels
                    labelsVal = formatLabels(that);
                    
                    that._prvt.minLabel.html(labelsVal.minVal);
                }
            }
        }
    }
    
    //animate function
    function animator(that) {
        
        if (that._prvt.isDragging) {
            
            requestAnimFrame(function() {
                animator(that);
            });
            
            moveSlider(that);
        }
    }
    
    //init
    RangeSlider.prototype.init = function() {
        //setup local functions to init the element
        sliderSetup(this);
    };
    // requestAnim shim layer by Paul Irish
    window.requestAnimFrame = (function() {
        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
        function( /* function */ callback, /* DOMElement */ element) {
            window.setTimeout(callback, 1000 / 60);
        };
    })();
    
    //format number 
    function formatAsNumber(nStr) {
        var x, x1, x2, rgx = /(\d+)(\d{3})/;
        nStr += '';
        x = nStr.split('.');
        x1 = x[0];
        x2 = x.length > 1 ? '.' + x[1] : '';
        //
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1' + ',' + '$2');
        }
        return x1 + x2;
    }
    
    // The actual plugin constructor
    function RangeSlider(element, options) {
        this.element = element;
        this.options = $.extend(true, {}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;
        //private variables
        this._prvt = $.extend(true, {}, prvt);
        this.init();
    }
    
    // A really lightweight plugin wrapper around the constructor, 
    // preventing against multiple instantiations
    $.fn[pluginName] = function(options) {
        return this.each(function() {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName, new RangeSlider(this, options));
            }
        });
    };
})(jQuery, window, document);
