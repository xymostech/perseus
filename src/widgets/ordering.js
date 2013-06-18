/** @jsx React.DOM */
(function(Perseus) {

var Orderer = React.createClass({
    getDefaultProps: function() {
        return {
            current: [],
            options: [
                {content: "Hello"},
                {content: "World $blah$"}
            ]
        };
    },

    render: function() {
        debugger;
        var sortable = <div class="sortable ui-helper-clearfix"
                            ref="orderer"><ul>{_.map(this.props.current, function(opt) {
            return <li data-content={opt}>{opt}</li>;
        })}</ul></div>;

        var bank = <div class="sortable bank ui-helper-clearfix"
                        ref="bank"><ul>{_.map(this.props.options, function(opt) {
            return <li data-content={opt.content}>{opt.content}</li>;
        })}</ul></div>;

        return <div>{sortable}{bank}</div>;
    },

    componentDidMount: function() {
        var component = this;
        var placeholder = $("<li>");
        placeholder.addClass("placeholder");

        var fake_draggable = $(".fake-draggable");
        if (fake_draggable.length === 0) {
            fake_draggable = $("<ul>");
            fake_draggable.addClass("fake-draggable").addClass("sortable-element");
            fake_draggable.appendTo("#perseus");
        }

        var $list = $(this.refs.orderer.getDOMNode()).children(":first");
        var $bank = $(this.refs.bank.getDOMNode()).children(":first");

        var $parent = $list.parent().parent();

        $parent.on("vmousedown", "li", function(event) {
            if (event.which !== 0 && event.which !== 1) {
                return;
            }

            event.preventDefault();

            var origTile = this,
                inBank = $bank.has(this).length > 0,
                tile = $(origTile).clone()[0],
                offset = $(origTile).offset(),
                click = {
                    left: event.pageX - offset.left - 3,
                    top: event.pageY - offset.top - 3
                },
                tileIndex = $(tile).index(),
                origIndex = $(tile).index();

            $(tile).addClass("dragging")
                   .css({ position: "absolute", "z-index": 100 })
                   .offset({
                       left: offset.left,
                       top: offset.top
                   })
                   .width($(origTile).width());

            placeholder.width($(origTile).width());
            if (inBank) {
                placeholder.prependTo($list);
            } else {
                placeholder.insertAfter(tile);
            }

            if (!inBank) {
                $(origTile).hide();
            }

            $(tile).appendTo(fake_draggable);

            $(document).bind("vmousemove vmouseup", function(event) {
                event.preventDefault();
                if (event.type === "vmousemove") {
                    $(tile).offset({
                        left: event.pageX - click.left,
                        top: event.pageY - click.top
                    });
                    var leftEdge = $list.offset().left,
                        midWidth = $(tile).offset().left - leftEdge,
                        index = 0,
                        sumWidth = 0;

                    $list.children("li").each(function() {
                        if (this === placeholder[0] || this === tile) {
                            return;
                        }
                        if (midWidth > sumWidth + $(this).outerWidth(true) / 2) {
                            index += 1;
                        }
                        sumWidth += $(this).outerWidth(true);
                    });

                    if (index !== tileIndex) {
                        tileIndex = index;
                        if (index === 0) {
                            placeholder.prependTo($list);
                        } else {
                            placeholder.detach();
                            var preceeding = $list.children("li")[index - 1];
                            placeholder.insertAfter(preceeding);
                        }
                    }
                } else if (event.type === "vmouseup") {
                    $(document).unbind("vmousemove vmouseup");
                    debugger;
                    var curr = _.map(component.props.current, function(elem) { return _.clone(elem); });
                    if (!inBank && origIndex > tileIndex) {
                        curr.splice(origIndex, 1);
                    }
                    curr.splice(tileIndex, 0, _.clone($(tile).data("content")));
                    if (!inBank && origIndex <= tileIndex) {
                        curr.splice(origIndex, 1);
                    }
                    $(tile).detach();
                    placeholder.detach();
                    component.props.onChange({current: curr});
                }
            });
        });
    },

    componentWillUnmount: function() {
        $(this.refs.orderer.getDOMNode()).off("vmousedown");
    },

    toJSON: function(skipValidation) {
        return {};
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
        };
    },

    render: function() {
        return <div />;
    },

    focus: function(i) {
        return true;
    },

    toJSON: function(skipValidation) {
        return {};
    }
});

Perseus.Widgets.register("orderer", Orderer);
Perseus.Widgets.register("orderer-editor", OrdererEditor);

var createSorter = function() {
    var sorter = {};
    var list;

    sorter.init = function(element) {
        list = $("[id=" + element + "]").last();
        var container = list.wrap("<div>").parent();
        var placeholder = $("<li>");
        placeholder.addClass("placeholder");
        container.addClass("sortable ui-helper-clearfix");
        var tileWidth = list.find("li").outerWidth(true);
        var numTiles = list.find("li").length;

        list.find("li").each(function(tileNum, tile) {
            $(tile).bind("vmousedown", function(event) {
                if (event.type === "vmousedown" && (event.which === 1 || event.which === 0)) {
                    event.preventDefault();
                    $(tile).addClass("dragging");
                    var tileIndex = $(this).index();
                    placeholder.insertAfter(tile);
                    placeholder.width($(tile).width());
                    $(this).css("z-index", 100);
                    var offset = $(this).offset();
                    var click = {
                        left: event.pageX - offset.left - 3,
                        top: event.pageY - offset.top - 3
                    };
                    $(tile).css({ position: "absolute" });
                    $(tile).offset({
                        left: offset.left,
                        top: offset.top
                    });

                    $(document).bind("vmousemove vmouseup", function(event) {
                        event.preventDefault();
                        if (event.type === "vmousemove") {
                            $(tile).offset({
                                left: event.pageX - click.left,
                                top: event.pageY - click.top
                            });
                            var leftEdge = list.offset().left;
                            var midWidth = $(tile).offset().left - leftEdge;
                            var index = 0;
                            var sumWidth = 0;
                            list.find("li").each(function() {
                                if (this === placeholder[0] || this === tile) {
                                    return;
                                }
                                if (midWidth > sumWidth + $(this).outerWidth(true) / 2) {
                                    index += 1;
                                }
                                sumWidth += $(this).outerWidth(true);
                            });
                            if (index !== tileIndex) {
                                tileIndex = index;
                                if (index === 0) {
                                    placeholder.prependTo(list);
                                    $(tile).prependTo(list);
                                } else {
                                    placeholder.detach();
                                    $(tile).detach();
                                    var preceeding = list.find("li")[index - 1];
                                    placeholder.insertAfter(preceeding);
                                    $(tile).insertAfter(preceeding);
                                }
                            }
                        } else if (event.type === "vmouseup") {
                            $(document).unbind("vmousemove vmouseup");
                            var position = $(tile).offset();
                            $(position).animate(placeholder.offset(), {
                                duration: 150,
                                step: function(now, fx) {
                                    position[fx.prop] = now;
                                    $(tile).offset(position);
                                },
                                complete: function() {
                                    $(tile).css("z-index", 0);
                                    placeholder.detach();
                                    $(tile).css({ position: "static" });
                                    $(tile).removeClass("dragging");
                                }
                            });
                        }
                    });
                }
            });
        });
    };

    sorter.getContent = function() {
        content = [];
        list.find("li").each(function(tileNum, tile) {
            content.push($.trim($(tile).find(".sort-key").text()));
        });
        return content;
    };

    sorter.setContent = function(content) {
        var tiles = [];
        $.each(content, function(n, sortKey) {
            var tile = list.find("li .sort-key").filter(function() {
                // sort-key must match exactly
                return $(this).text() === sortKey;
            }).closest("li").get(0);
            $(tile).detach();  // remove matched tile so you can have duplicates
            tiles.push(tile);
        });
        list.append(tiles);
    };

    return sorter;
}

})(Perseus);

