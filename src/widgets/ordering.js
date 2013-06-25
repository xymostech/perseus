/** @jsx React.DOM */
(function(Perseus) {

var Draggable = React.createClass({
    getDefaultProps: function() {
        return {
            floating: false,
            placeholder: false,
            content: "",
            onMouseDown: function() {},
        };
    },

    render: function() {
        var style = {};
        if (this.props.floating || this.props.animating) {
            style.position = "fixed";
            style.left = this.props.startOffset.left - $(document).scrollLeft();
            style.top = this.props.startOffset.top - $(document).scrollTop();
        }
        if (this.props.width) {
            style.width = this.props.width;
        }
        if (this.props.hidden) {
            style.display = "none";
        } else {
            style.display = "block";
        }

        var className = ["card"];
        if (this.props.placeholder) {
            className.push("placeholder");
        }
        if (this.props.floating) {
            className.push("dragging");
        }
        if (this.props.dragHint) {
            className.push("drag-hint");
        }
        if (this.props.stack) {
            className.push("stack");
        }

        var rendererProps = _.pick(this.props, "content");

        return <li className={className.join(" ")}
                   style={style}
                   onMouseDown={this.onMouseDown}
                   onTouchStart={this.onMouseDown}>
                {Perseus.Renderer(rendererProps)}
            </li>;
    },

    onMouseDown: React.autoBind(function(event) {
        if (event.data.rightMouseButton) {
            return;
        }

        event.preventDefault();
        this.props.onMouseDown(this, event);
    }),

    componentDidMount: function() {
        console.log("Mounting...");
        if (this.props.floating) {
            $(document).on("vmousemove", this.onVMouseMove);
            $(document).on("vmouseup", this.onVMouseUp);
        }

        if (this.props.animating) {
            $(this.getDOMNode()).animate(
                this.props.animateTo,
                100,
                this.props.onAnimateEnd
            );
        }
    },

    componentWillUnmount: function() {
        console.log("Unounting...");
        if (this.props.floating) {
            $(document).off("vmousemove", this.onVMouseMove);
            $(document).off("vmouseup", this.onVMouseUp);
        }
    },

    componentDidUpdate: function(prevProps, prevState, rootNode) {
        if (this.props.animating && !prevProps.animating) {
            $(this.getDOMNode()).animate(
                this.props.animateTo,
                100,
                this.props.onAnimateEnd
            );
        }
    },

    onVMouseMove: React.autoBind(function(event) {
        if (this.props.floating) {
            event.preventDefault();
            this.setOffset(event.pageX, event.pageY);
            this.props.onMouseMove(this);
        }
    }),

    onVMouseUp: React.autoBind(function(event) {
        if (this.props.floating) {
            event.preventDefault();
            this.props.onMouseUp(this, event);
        }
    }),

    setOffset: React.autoBind(function(x, y) {
        this.getDOMNode().style.left =
            (this.props.startOffset.left +
             x - this.props.startMouse.left -
             $(document).scrollLeft()
            ) + "px";
        this.getDOMNode().style.top =
            (this.props.startOffset.top +
             y - this.props.startMouse.top -
             $(document).scrollTop()
            ) + "px";
    })
});

var Orderer = React.createClass({
    getDefaultProps: function() {
        return {
            current: [],
            options: [],
            correctOptions: []
        };
    },

    getInitialState: function() {
        return {
            current: [],
            dragging: false
        };
    },

    render: function() {
        var orderer = this;

        var dragging = this.state.dragging &&
            <Draggable floating={true}
                       content={this.state.dragContent}
                       startOffset={this.state.offsetPos}
                       startMouse={this.state.grabPos}
                       width={this.state.dragWidth}
                       onMouseUp={this.onRelease}
                       onMouseMove={this.onMouseMove}
                       key={this.state.dragKey}
                       />;

        var animating = this.state.animating &&
            <Draggable floating={false}
                       animating={true}
                       content={this.state.dragContent}
                       startOffset={this.state.offsetPos}
                       width={this.state.dragWidth}
                       animateTo={this.state.animateTo}
                       onAnimateEnd={this.state.onAnimateEnd}
                       key={this.state.dragKey}
                       ref="animating"
                       />;

        var sortable = <div className="ui-helper-clearfix draggable-box">
            {(this.state.current.length === 0 ||
             (this.state.current.length === 1 &&
              this.state.current[0].hidden)) &&
                <Draggable dragHint={true}
                           width={20} />
            }
            <ul ref="dragList">
            {_.map(this.state.current, function(opt, i) {
                return <Draggable content={opt.content}
                                  placeholder={opt.placeholder}
                                  hidden={opt.hidden}
                                  width={opt.width}
                                  index={i}
                                  key={opt.key}
                                  onMouseDown={orderer.onCurrentClick} />;
            })}
            </ul>
        </div>;

        var bank = <div ref="bank"
                        style={{margin: "0px 13px 30px"}}
                        className="ui-helper-clearfix">
            <ul>
            {_.map(this.props.options, function(opt, i) {
                return <Draggable content={opt.content}
                                  index={i}
                                  stack={true}
                                  onMouseDown={orderer.onBankClick} />;
            })}
            </ul>
        </div>;

        return <div className="draggy-boxy-thing">
                   {bank}
                   {sortable}
                   {dragging}
                   {animating}
               </div>;
    },

    onCurrentClick: React.autoBind(function(draggable, event) {
        var $draggable = $(draggable.getDOMNode());
        var list = this.state.current.slice();

        list.splice(draggable.props.index, 1, {
            placeholder: true,
            content: "",
            width: $draggable.width(),
            hidden: true,
            key: _.uniqueId("perseus_placeholder_card_")
        });

        this.startDragging(draggable, event, list);
    }),

    onBankClick: React.autoBind(function(draggable, event) {
        var $draggable = $(draggable.getDOMNode());
        var list = this.state.current.slice();

        list.splice(this.findCorrectIndex(draggable, list), 0, {
            placeholder: true,
            content: "",
            width: $draggable.width(),
            hidden: true,
            key: _.uniqueId("perseus_placeholder_card_")
        });

        this.startDragging(draggable, event, list);
    }),

    onRelease: React.autoBind(function(draggable, event) {
        var inCardBank = this.isCardInBank(draggable);
        var index = this.placeholderIndex();

        var onAnimateEnd = function() {
            var list = this.state.current.slice();

            if (inCardBank) {
                list.splice(index, 1);
            } else {
                var newCard = {
                    content: draggable.props.content,
                    key: _.uniqueId("perseus_draggable_card_"),
                    width: draggable.props.width
                };

                list.splice(index, 1, newCard);
            }

            this.props.onChange({
                current: list
            });
            this.setState({
                current: list,
                dragging: false,
                animating: false
            });
        }.bind(this);

        var offset = $(draggable.getDOMNode()).offset();
        var finalOffset = null;
        if (inCardBank) {
            _.chain(this.props.options)
             .zip($(this.refs.bank.getDOMNode()).find("li"))
             .each(function(opt) {
                if (opt[0].content == draggable.props.content) {
                    finalOffset = $(opt[1]).offset();
                }
             });
        } else {
            finalOffset =
                $(this.refs.dragList.getDOMNode().childNodes[index]).offset();
        }

        if (finalOffset == null) {
            onAnimateEnd();
        } else {
            this.setState({
                offsetPos: offset,
                animateTo: finalOffset,
                onAnimateEnd: onAnimateEnd,
                animating: true,
                dragging: false
            });
        }
    }),

    onMouseMove: React.autoBind(function(draggable) {
        var newList = this.state.current.slice();

        newList[this.placeholderIndex()].hidden =
                this.isCardInBank(draggable);

        newList = this.reorderList(draggable, newList);

        this.setState({current: newList});
    }),

    isCardInBank: function(draggable) { var $draggable = $(draggable.getDOMNode()),
            $bank = $(this.refs.bank.getDOMNode()),
            draggableOffset = $draggable.offset(),
            bankOffset = $bank.offset(),
            draggableSize = {width: $draggable.outerWidth(true), height: $draggable.outerHeight(true)},
            bankSize = {width: $bank.outerWidth(true), height: $bank.outerHeight(true)};

        return draggableOffset.top + draggableSize.height / 2 < bankOffset.top + bankSize.height;
    },

    startDragging: function(draggable, event, list) {
        var $draggable = $(draggable.getDOMNode());
        var draggableOffset = $draggable.offset();

        this.setState({
            current: list,
            dragging: true,
            dragContent: draggable.props.content,
            dragWidth: $draggable.width(),
            dragKey: _.uniqueId("perseus_dragging_card_"),
            grabPos: {
                left: event.data.globalX,
                top: event.data.globalY
            },
            offsetPos: {
                left: draggableOffset.left,
                top: draggableOffset.top
            }
        });
    },

    placeholderIndex: function() {
        var index;
        _.each(this.state.current, function(v, i) {
            if (v.placeholder) {
                index = i;
            }
        });
        return index;
    },

    reorderList: function(draggable, list) {
        var $dragList = $(this.refs.dragList.getDOMNode());

        var index = this.findCorrectIndex(draggable, list);
        var oldIndex = this.placeholderIndex();

        if (index !== oldIndex) {
            var placeholder;
            list = _.reject(this.state.current, function(v) {
                if (v.placeholder) {
                    placeholder = v;
                }
                return v.placeholder;
            });

            list.splice(index, 0, placeholder);
        }
        return list;
    },

    findCorrectIndex: function(draggable, list) {
        var $dragList = $(this.refs.dragList.getDOMNode()),
            leftEdge = $dragList.offset().left,
            midWidth = $(draggable.getDOMNode()).offset().left - leftEdge,
            index = 0,
            sumWidth = 0;

        _.chain(this.refs.dragList.getDOMNode().childNodes)
         .zip(list)
         .reject(function(v) { return v[1].placeholder })
         .each(function(v, i) {
            var outerWidth = $(v[0]).outerWidth(true);
            if (midWidth > sumWidth + outerWidth / 2) {
                index += 1;
            }
            sumWidth += outerWidth;
        });

        return index;
    },

    toJSON: function(skipValidation) {
        return {current: _.map(this.props.current, function(v) {
            return v.content;
        })};
    },

    simpleValidate: function(rubric) {
        return Orderer.validate(this.toJSON(), rubric);
    },
});

_.extend(Orderer, {
    validate: function(state, rubric) {
        if (state.current.length === 0) {
            return {
                type: "invalid",
                message: null
            };
        }

        var correct = _.isEqual(
            state.current,
            _.pluck(rubric.correctOptions, 'content')
        );

        return {
            type: "points",
            earned: correct ? 1 : 0,
            total: 1,
            message: null
        };

    }
});

var OrdererEditor = React.createClass({
    getDefaultProps: function() {
        return {
            correctOptions: [{
                content: "x"
            }],
            otherOptions: [{
                content: "y"
            }],
        };
    },

    render: function() {
        return <div className="perseus-widget-orderer">
            <div>Correct answer:</div>
            <ul>
                {this.props.correctOptions.map(function(option, i) {
                    return <li>
                        <input
                            type="text"
                            ref={"correcteditor" + i}
                            style={{
                                width: this.getTextWidth(option.content)
                            }}
                            onInput={
                                this.onCorrectContentChange.bind(this, i)
                            }
                            value={option.content} />
                    </li>;
                }, this)}
                <li>
                    <input type="text"
                           ref={"correcteditor_extra"}
                           onInput={this.addCorrectOption}
                           style={{width: 0}}
                           value={""} />
                </li>
            </ul>

            <span className="ui-helper-clearfix" />

            <div>Other cards:</div>

            <ul>
                {this.props.otherOptions.map(function(option, i) {
                    return <li>
                        <input type="text"
                               ref={"othereditor" + i}
                               style={{
                                   width: this.getTextWidth(option.content)
                               }}
                               onInput={
                                   this.onOtherContentChange.bind(this, i)
                               }
                               value={option.content} />
                    </li>;
                }, this)}
                <li>
                    <input type="text"
                           ref={"othereditor_extra"}
                           onInput={this.addOtherOption}
                           style={{width: 0}}
                           value={""} />
                </li>
            </ul>

            <span className="ui-helper-clearfix" />
        </div>;
    },

    addCorrectOption: React.autoBind(function(e) {
        e.preventDefault();

        var options = this.props.correctOptions;
        var blankOption = {content: e.target.value};
        this.props.onChange({correctOptions: options.concat([blankOption])});
        e.target.value = "";
        this.correctFocus(options.length);
    }),

    addOtherOption: React.autoBind(function(e) {
        e.preventDefault();

        var options = this.props.otherOptions;
        var blankOption = {content: e.target.value};
        this.props.onChange({otherOptions: options.concat([blankOption])});
        e.target.value = "";
        this.otherFocus(options.length);
    }),

    onCorrectContentChange: function(optionIndex, e) {
        var options = this.props.correctOptions.slice();
        var option = _.clone(options[optionIndex]);

        option.content = e.target.value;
        options[optionIndex] = option;

        var didDelete = false;
        var i = options.length - 1;
        for (; i >= 0 && options[i].content === ""; i--) {
            options.splice(i, 1);
            didDelete = true;
        }

        if (didDelete) {
            this.correctFocus("_extra");
        }

        this.props.onChange({correctOptions: options});
    },

    onOtherContentChange: function(optionIndex, e) {
        var options = this.props.otherOptions.slice();
        var option = _.clone(options[optionIndex]);

        option.content = e.target.value;
        options[optionIndex] = option;

        var didDelete = false;
        var i = options.length - 1;
        for (; i >= 0 && options[i].content === ""; i--) {
            options.splice(i, 1);
            didDelete = true;
        }

        if (didDelete) {
            this.otherFocus("_extra");
        }

        this.props.onChange({otherOptions: options});
    },

    getTextWidth: function(text) {
        var testElement = $("<span>");
        testElement.text(text);

        testElement.appendTo("body");
        var width = testElement.width();
        testElement.remove();

        return width + 5;
    },

    correctFocus: function(i) {
        var editor = this.refs["correcteditor" + i].getDOMNode();
        editor.focus();
        editor.setSelectionRange(editor.value.length, editor.value.length);
        return true;
    },

    otherFocus: function(i) {
        var editor = this.refs["othereditor" + i].getDOMNode();
        editor.focus();
        editor.setSelectionRange(editor.value.length, editor.value.length);
        return true;
    },

    toJSON: function(skipValidation) {
        var options =
            _.chain(_.pluck(this.props.correctOptions, 'content'))
             .union(_.pluck(this.props.otherOptions, 'content'))
             .uniq()
             .reject(function(content) { return content === ""; })
             .sort()
             .map(function(content) {
                 return { content: content };
                })
             .value();

        return {
            options: options,
            correctOptions: this.props.correctOptions
        };
    }
});

Perseus.Widgets.register("orderer", Orderer);
Perseus.Widgets.register("orderer-editor", OrdererEditor);

})(Perseus);

