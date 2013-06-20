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
        if (this.props.floating) {
            style.position = "fixed";
            style.left = this.props.startOffset.left;
            style.top = this.props.startOffset.top;
        }
        if (this.props.width) {
            style.width = this.props.width;
        }
        if (this.props.hidden) {
            style.display = "none";
        } else {
            style.display = "block";
        }

        var className = [];
        if (this.props.placeholder) {
            className.push("placeholder");
        }
        if (this.props.floating) {
            className.push("dragging");
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

        this.props.onMouseDown(this, event);
    }),

    componentDidMount: function() {
        if (this.props.floating) {
            $(document).on("vmousemove", this.onVMouseMove);
            $(document).on("vmouseup", this.onVMouseUp);
        }
    },

    componentWillUnmount: function() {
        if (this.props.floating) {
            $(document).off("vmousemove", this.onVMouseMove);
            $(document).off("vmouseup", this.onVMouseUp);
        }
    },

    onVMouseMove: React.autoBind(function(event) {
        event.preventDefault();
        this.setOffset(event.pageX, event.pageY);
        this.props.onMouseMove(this);
    }),

    onVMouseUp: React.autoBind(function(event) {
        event.preventDefault();
        this.props.onMouseUp(this, event);
    }),

    setOffset: React.autoBind(function(x, y) {
        this.getDOMNode().style.left = (this.props.startOffset.left + x - this.props.startMouse.left) + "px";
        this.getDOMNode().style.top = (this.props.startOffset.top + y - this.props.startMouse.top) + "px";
    })
});

var Orderer = React.createClass({
    getDefaultProps: function() {
        return {
            current: [],
            options: []
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

        var dragging = <div className="sortable sortable-hidden" ref="dragging">
        <ul>{this.state.dragging ?
            <Draggable floating={true}
                       content={this.state.dragContent}
                       startOffset={this.state.offsetPos}
                       startMouse={this.state.grabPos}
                       width={this.state.dragWidth}
                       onMouseUp={this.onRelease}
                       onMouseMove={this.onMouseMove}
                       /> : null}
        </ul></div>;

        var sortable = <div className="sortable ui-helper-clearfix">
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
            </ul></div>;

        var bank = <div ref="bank"
                        className="sortable sortable-bank ui-helper-clearfix">
            <ul>{_.map(this.props.options, function(opt, i) {
                return <Draggable content={opt.content}
                                  index={i}
                                  onMouseDown={orderer.onBankClick} />;
        })}</ul></div>;

        return <div>{sortable}{bank}{dragging}</div>;
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
        var list = this.state.current.slice();
        var index = this.placeholderIndex();

        if (this.isCardInBank(draggable)) {
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
            dragging: false
        });
    }),

    isCardInBank: function(draggable) {
        var $draggable = $(draggable.getDOMNode()),
            $bank = $(this.refs.bank.getDOMNode()),
            draggableOffset = $draggable.offset(),
            bankOffset = $bank.offset(),
            draggableSize = {width: $draggable.outerWidth(true), height: $draggable.outerHeight(true)},
            bankSize = {width: $bank.outerWidth(true), height: $bank.outerHeight(true)};

        return draggableOffset.top + draggableSize.height / 2 > bankOffset.top;
    },

    onMouseMove: React.autoBind(function(draggable) {
        var newList = this.state.current.slice();

        newList[this.placeholderIndex()].hidden =
                this.isCardInBank(draggable);

        newList = this.reorderList(draggable, newList);

        this.setState({current: newList});
    }),

    startDragging: function(draggable, event, list) {
        var $draggable = $(draggable.getDOMNode());
        var draggableOffset = $draggable.offset();

        this.setState({
            current: list,
            dragging: true,
            dragContent: draggable.props.content,
            dragWidth: $draggable.width(),
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
        return {
            type: "invalid",
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
        var dropdownGroupName = _.uniqueId("perseus_orderer_");
        return <div className="perseus-widget-orderer">
            <div>Correct answer:</div>
            <ul>
                {this.props.correctOptions.map(function(option, i) {
                    return <li>
                        <div>
                            <input
                                type="text"
                                ref={"correcteditor" + i}
                                style={{
                                    width: this.getTextWidth(option.content),
                                    float: "left"
                                }}
                                onInput={
                                    this.onCorrectContentChange.bind(this, i)
                                }
                                value={option.content} />
                        </div>
                    </li>;
                }, this)}
            </ul>

            <span className="ui-helper-clearfix" />

            <div className="add-option-container">
                <a href="#" className="simple-button orange"
                        onClick={this.addCorrectOption}>
                    <span className="icon-plus" />
                    Add a card
                </a>
            </div>

            <div>Other cards:</div>

            <ul>
                {this.props.otherOptions.map(function(option, i) {
                    return <li>
                        <div>
                            <input
                                type="text"
                                ref={"othereditor" + i}
                                style={{
                                    width: this.getTextWidth(option.content),
                                    float: "left"
                                }}
                                onInput={
                                    this.onOtherContentChange.bind(this, i)
                                }
                                value={option.content} />
                        </div>
                    </li>;
                }, this)}
            </ul>

            <span className="ui-helper-clearfix" />

            <div className="add-option-container">
                <a href="#" className="simple-button orange"
                        onClick={this.addOtherOption}>
                    <span className="icon-plus" />
                    Add a card
                </a>
            </div>
        </div>;
    },

    addCorrectOption: React.autoBind(function(e) {
        e.preventDefault();

        var options = this.props.correctOptions;
        var blankOption = {content: ""};
        this.props.onChange({correctOptions: options.concat([blankOption])});
        this.correctFocus(options.length);
    }),

    addOtherOption: React.autoBind(function(e) {
        e.preventDefault();

        var options = this.props.otherOptions;
        var blankOption = {content: ""};
        this.props.onChange({otherOptions: options.concat([blankOption])});
        this.otherFocus(options.length);
    }),

    onCorrectContentChange: function(optionIndex, e) {
        var options = this.props.correctOptions.slice();
        var option = _.clone(options[optionIndex]);

        option.content = e.target.value;
        options[optionIndex] = option;
        this.props.onChange({correctOptions: options});
    },

    onOtherContentChange: function(optionIndex, e) {
        var options = this.props.otherOptions.slice();
        var option = _.clone(options[optionIndex]);

        option.content = e.target.value;
        options[optionIndex] = option;
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
        this.refs["correcteditor" + i].getDOMNode().focus();
        return true;
    },

    otherFocus: function(i) {
        this.refs["othereditor" + i].getDOMNode().focus();
        return true;
    },

    toJSON: function(skipValidation) {
        var options =
            _.chain(_.pluck(this.props.correctOptions, 'content'))
             .union(_.pluck(this.props.otherOptions, 'content'))
             .uniq()
             .sort()
             .map(function(content) {
                 return { content: content };
                })
             .value();

        return {options: options};
    }
});

Perseus.Widgets.register("orderer", Orderer);
Perseus.Widgets.register("orderer-editor", OrdererEditor);

})(Perseus);

