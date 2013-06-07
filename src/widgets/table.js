/** @jsx React.DOM */
(function(Perseus) {

function stringArrayOfSize(size) {
    var array = [];
    _(size).times(function() {
        array.push("");
    });
    return array;
}

var Table = React.createClass({
    render: function() {
        var headers = this.props.headers;
        return <table>
            <thead>
                <tr>{
                    headers.map(function(header) {
                        return <th>{header}</th>;
                    })
                }
                </tr>
            </thead>
            <tbody>{
                _(this.props.rows).times(function(r) {
                    return <tr>{
                        _(this.props.columns).times(function(c) {
                            return <td>
                                <input
                                    ref={"answer" + r + "," + c}
                                    type="text"
                                />
                            </td>;
                        })
                    }</tr>;
                }.bind(this))
            }
            </tbody>
        </table>;
    },

    toJSON: function() {
        var self = this;
        return _.map(self.props.answers, function(answer, r) {
            return _.map(self.props.headers, function(header, c) {
                return self.refs["answer" + r + "," + c].getDOMNode().value;
            });
        });
    },

    simpleValidate: function(rubric) {
        return Table.validate(this.toJSON(), rubric);
    }
});

_.extend(Table, {
    purifyAnswers: function(table) {
        var filled = _.filter(table, function (row) {

            // Check if row has a cell that is nonempty
            return _.some(row, _.identity);
        });
        var nums = _.map(filled, function(row) {
            return _.map(row, Number);
        });
        return nums.sort(function (aRow, bRow) {
            var i = 0;
            while (i < aRow.length && aRow[i] === bRow[i]) {
                i += 1;
            }
            if (i === aRow.length) {
                return 0;
            } else {
                return aRow[i] < bRow[i] ? -1 : 1;
            }
        });
    },

    validate: function(state, rubric) {
        var supplied = Table.purifyAnswers(state);
        var solution = Table.purifyAnswers(rubric.answers);
        if (! supplied.length) {
            return {
                type: "invalid",
                message: null
            };
        } else {
            var correct = _.isEqual(supplied, solution);

            return {
                type: "points",
                earned: correct ? 1 : 0,
                total: 1,
                message: null
            };
        }
    }
});

var TableEditor = React.createClass({
    getInitialState: function() {
        var defaultRows = 4;
        var defaultColumns = 1;
        var blankAnswers = [];
        _(defaultRows).times(function() {
            blankAnswers.push(stringArrayOfSize(defaultColumns));
        });
        return {
            headers: [""],
            rows: defaultRows,
            columns: defaultColumns,
            rawRows: defaultRows,
            rawColumns: defaultColumns,
            answers: blankAnswers,
        };
    },

    render: function() {
        return <div>
            <div>
                <label>
                    Number of columns:
                    <input
                        ref="numberOfColumns"
                        type="text"
                        value={this.state.rawColumns}
                        onKeyUp={this.sizeKeyUp}
                    />
                </label>
            </div>
            <div>
                <label>
                    Number of rows:
                    <input
                        ref="numberOfRows"
                        type="text"
                        value={this.state.rawRows}
                        onKeyUp={this.sizeKeyUp}
                    />
                </label>
            </div>
            <div>
                Table of answer type:
                <ul>
                    <li>
                        <label>
                            <input
                                type="radio"
                                checked="checked"
                            />
                            Set of values (complete)
                        </label>
                    </li>
                </ul>
            </div>
            <div>
                <table>
                    <thead>
                        <tr>{
                            this.loopColumns(function(i) {
                                return <th>
                                    <input
                                        ref={"columnHeader" + i}
                                        type="text"
                                        value={this.state.headers[i]}
                                        onKeyUp={this.headerKeyUp}
                                    />
                                </th>;
                            })
                        }</tr>
                    </thead>
                    <tbody>{
                        this.loopRows(function(r) {
                            return <tr>{
                                this.loopColumns(function(c) {
                                    return <td>
                                        <input
                                            ref={"answer" + r + "," + c}
                                            type="text"
                                            onKeyUp={this.answerKeyUp}
                                            value={this.state.answers[r][c]}
                                        />
                                    </td>;
                                })
                            }</tr>;
                        })
                    }</tbody>
                </table>
            </div>
        </div>;
    },

    updateState: function (update) {
        this.setState(update);
        this.props.onChange();
    },

    headerKeyUp: React.autoBind(function() {
        var headers = this.state.headers.map(function (header, i) {
            return this.refs["columnHeader" + i].getDOMNode().value;
        }, this);
        this.updateState({headers: headers});
    }),

    sizeKeyUp: React.autoBind(function() {
        var rawRows = this.refs.numberOfRows.getDOMNode().value;
        var rawCols = this.refs.numberOfColumns.getDOMNode().value;
        var rows = +rawRows || 0;
        var cols = +rawCols || 0;
        if (rows < 1) {
            rows = 1;
        }
        if (rows > 99) {
            rows = 99;
        }
        if (cols < 1) {
            cols = 1;
        }
        if (cols > 99) {
            cols = 99;
        }
        var oldColumns = this.state.columns;
        var oldRows = this.state.rows;

        var answers = this.state.answers;
        if (oldRows < rows) {
            _(rows - oldRows).times(function() {
                answers.push(stringArrayOfSize(oldColumns));
            });
        }

        var headers = this.state.headers;

        function fixColumnSizing(array) {
            if (oldColumns < cols) {
                _(cols - oldColumns).times(function() {
                    array.push("");
                });
            }
        }

        fixColumnSizing(headers);
        _.each(answers, fixColumnSizing);

        this.updateState({
            rows: rows,
            columns: cols,
            rawRows: rawRows,
            rawColumns: rawCols,
            answers: answers,
            headers: headers
        });
    }),

    loopRows: function(callback) {
        var self = this;
        var ret = [];
        _(this.state.rows).times(function (r) {
            ret.push(callback.call(self, r));
        });
        return ret;
    },

    loopColumns: function(callback) {
        var self = this;
        var ret = [];
        _(this.state.columns).times(function (c) {
            ret.push(callback.call(self, c));
        });
        return ret;
    },

    answerKeyUp: React.autoBind(function() {
        var self = this;
        var answers = this.loopRows(function(r) {
            return this.loopColumns(function(c) {
                return this.refs["answer" + r + "," + c].getDOMNode().value;
            });
        });
        this.updateState({answers: answers});
    }),

    toJSON: function() {
        var self = this;
        var answers = this.state.answers.slice(0, this.state.rows);
        answers = _.map(answers, function(row) {
            return row.slice(0, self.state.columns);
        });
        var json = _.pick(this.state, 'rows', 'columns');
        json.answers = answers;
        json.headers = this.state.headers.slice(0, this.state.columns);
        return json;
    }
});

Perseus.Widgets.register("table", Table);
Perseus.Widgets.register("table-editor", TableEditor);

})(Perseus);