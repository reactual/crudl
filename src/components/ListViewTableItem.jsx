import React from 'react'
import classNames from 'classnames'
import { autobind } from 'core-decorators'

@autobind
class ListViewItem extends React.Component {

    static propTypes = {
        itemId: React.PropTypes.string.isRequired,
        fields: React.PropTypes.array.isRequired,
        data: React.PropTypes.object.isRequired,
        onClick: React.PropTypes.func.isRequired,
        selectEnabled: React.PropTypes.bool.isRequired,
        onSelectChange: React.PropTypes.func.isRequired,
        selected: React.PropTypes.bool.isRequired,
    };

    handleClick() {
        if (this.props.onClick) {
            this.props.onClick(this.props.data)
        }
    }

    handleSelectChanged() {
        const { itemId, data, onSelectChange } = this.props
        onSelectChange(itemId, data)
    }

    render() {
        const { fields, data, onClick, selectEnabled, selected } = this.props
        return (
            <tr>
                {selectEnabled &&
                    <td>
                        <div>
                            <input type="checkbox" onChange={this.handleSelectChanged} checked={selected} />
                        </div>
                    </td>
                }
                {fields.map((f, index) => {
                    let value = f.getValue(data)
                    let renderClass = f.render

                    if (typeof f.render === 'function') {
                        value = f.render(value, data)
                        renderClass = 'string'
                    }

                    const cellClass = classNames(renderClass, {
                        main: f.main,
                        true: f.render && value,
                        false: f.render && !value,
                        // 'true': value,
                        // 'false': value
                    })

                    if (f.main && onClick) {
                        return (
                            <th key={index} data-column={index} className={cellClass}>
                                <div onClick={this.handleClick} className="item-handler">{value}</div>
                            </th>
                        )
                    }
                    return (
                        <td key={index} data-column={index} className={cellClass}>
                            <div>{value}</div>
                        </td>
                    )
                })}
            </tr>
        )
    }
}

export default ListViewItem
