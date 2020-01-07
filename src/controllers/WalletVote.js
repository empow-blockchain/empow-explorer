import React, { Component } from 'react'
import { connect } from 'react-redux';
import WalletSidebar from '../components/WalletSidebar'
import Input from '../components/Input'
import { toastr } from 'react-redux-toastr'
import Utils from '../utils/index'
import InstallWalletOverlay from '../components/InstallWalletOverlay';
import ServerAPI from '../ServerAPI';
import _ from 'lodash'
import FlagIcon from '../components/FlagIcon'
import Select from 'react-select'
import { setAddressInfo } from '../reducers/appReducer'

class WalletVote extends Component {

    constructor(props) {
        super(props);

        this.state = {
            amount: 0,
            voteBalance: 0,
            isLoading: false,
            voted: 0,
            listProducers: [],
            producerOptions: [],
            selectedProducer: { value: null, label: "Search or select producer to vote..." },
            unvoteAmount: 0,
            unvoteAddress: null,
            showUnvote: 0
        };
    };

    componentDidMount() {

        let producer = false

        if (this.props.match || this.props.match.params || this.props.match.params.producer) {
            producer = this.props.match.params.producer
        }

        ServerAPI.getListProducers().then(listProducers => {

            let producerOptions = []

            for (let i = 0; i < listProducers.length; i++) {

                if(producer && listProducers[i].address === producer) {
                    this.setState({
                        selectedProducer: {
                            value: listProducers[i],
                            label: <div className="producer-selected"><FlagIcon code={listProducers[i].loc.toLowerCase()}></FlagIcon> <p className="name">{listProducers[i].name ? listProducers[i].name : listProducers[i].pubkey}</p></div>
                        }
                    })
                }

                let avatar = listProducers[i].avatar ? listProducers[i].avatar : "https://eosx-apigw.eosx.io/logo-proxy/producer/https%3A%2F%2Fimg.bafang.com%2Fcdn%2Fassets%2Fimgs%2FMjAxOTg%2FC3B8310FFC1B46DA82C8ED7910C2AD61.png"
                let name = listProducers[i].name ? listProducers[i].name : listProducers[i].pubkey
                let option = {
                    value: listProducers[i],
                    label: <div className="producer-option">
                        <div className="thumbnail">
                            <img className="logo" alt="witness" src={avatar}></img>
                        </div>
                        <div className="info">
                            <p className="name text-truncate">{name}</p>
                            <div className="location">
                                <FlagIcon code={listProducers[i].loc.toLowerCase()}></FlagIcon>
                                <p>{Utils.countryCodeToContryName(listProducers[i].loc)}</p>
                            </div>
                        </div>
                    </div>
                }

                producerOptions.push(option)
            }

            this.setState({ producerOptions, listProducers })

        })
    }

    componentDidUpdate(prevProps) {
        if (_.isEqual(prevProps, this.props)) {
            return;
        }

        if (this.props.addressInfo) {
            const voteBalance = this.props.addressInfo.token && this.props.addressInfo.token.vote ? this.props.addressInfo.token.vote : 0
            const voted = this.getVoted(this.props.addressInfo.vote_infos)
            this.setState({
                voteBalance,
                voted
            })
        }
    }

    vote() {
        this.setState({ isLoading: true })

        const { amount, selectedProducer } = this.state

        if (!selectedProducer.value) {
            toastr.error('', "Please select producer first")
            this.setState({ isLoading: false })
            return
        }

        const tx = window.empow.callABI("vote_producer.empow", "vote", [this.props.addressInfo.address, selectedProducer.value.address, parseFloat(amount).toFixed(8).toString()])
        tx.addApprove("*", "unlimited")
        const handler = window.empow.signAndSend(tx)

        handler.on("failed", (error) => {
            toastr.error('', Utils.getTransactionErrorMessage(error + ""))
            this.setState({ isLoading: false })
        })

        handler.on("success", (res) => {
            toastr.success('', "Vote Success", {
                component: (
                    <a target="_blank" rel="noopener noreferrer" href={`/tx/${res.transaction.hash}`}>View Tx</a>
                )
            })
            this.setState({ isLoading: false })

            // reload address info
            ServerAPI.getAddress(this.props.addressInfo.address).then(addressInfo => this.props.setAddressInfo(addressInfo))
        })
    }

    unvote() {
        const { unvoteAmount, unvoteAddress } = this.state

        const tx = window.empow.callABI("vote_producer.empow", "unvote", [this.props.addressInfo.address, unvoteAddress, parseFloat(unvoteAmount).toFixed(8).toString()])
        tx.addApprove("*", "unlimited")
        const handler = window.empow.signAndSend(tx)

        handler.on("failed", (error) => {
            toastr.error('', Utils.getTransactionErrorMessage(error + ""))
            this.setState({ isLoading: false })
        })

        handler.on("success", (res) => {
            toastr.success('', "Unvote Success", {
                component: (
                    <a target="_blank" rel="noopener noreferrer" href={`/tx/${res.transaction.hash}`}>View Tx</a>
                )
            })

            this.setState({showUnvote: false})

            // reload address info
            ServerAPI.getAddress(this.props.addressInfo.address).then(addressInfo => this.props.setAddressInfo(addressInfo))
        })
    }

    showUnvote(address, amount) {
        this.setState({showUnvote: true, unvoteAmount: amount, unvoteAddress: address})
    }

    getVoted(vote_infos) {
        if (vote_infos.length === 0) return 0;

        let amount = 0
        for (let i = 0; i < vote_infos.length; i++) {
            amount += parseFloat(vote_infos[i].votes)
        }

        return amount
    }

    getInfo(address) {
        const { listProducers } = this.state

        for (let i = 0; i < listProducers.length; i++) {
            if (address === listProducers[i].address) {
                listProducers[i].rank = i + 1
                return listProducers[i]
            }
        }
    }

    selectProducer(producer) {
        this.setState({
            selectedProducer: {
                value: producer,
                label: <div className="producer-selected"><FlagIcon code={producer.loc.toLowerCase()}></FlagIcon> <p className="name">{producer.name ? producer.name : producer.pubkey}</p></div>
            }
        })
    }

    pickAmount(percent) {
        this.setState({
            amount: this.state.voteBalance * (percent / 100)
        })
    }

    render() {

        const { amount, isLoading, voted, voteBalance, producerOptions, selectedProducer,unvoteAmount,showUnvote } = this.state
        const { addressInfo } = this.props

        return (
            <section id="wallet-vote">
                <div className="container">
                    <div className="row">
                        <div className="col-md-3">
                            <WalletSidebar active="vote"></WalletSidebar>
                        </div>
                        <div className="col-md-9">
                            <div className="card">
                                {!addressInfo && <InstallWalletOverlay />}
                                <div className="statistic">
                                    <div className="one-statistic">
                                        <p className="title">TOTAL VOTE</p>
                                        <p className="number">{Utils.formatCurrency(voted + voteBalance, 8)} VOTE</p>
                                    </div>
                                    <div className="one-statistic">
                                        <p className="title">VOTED</p>
                                        <p className="number">{Utils.formatCurrency(voted, 8)} VOTE</p>
                                    </div>
                                    <div className="one-statistic">
                                        <p className="title">REMAIN</p>
                                        <p className="number">{Utils.formatCurrency(voteBalance, 8)} VOTE</p>
                                    </div>
                                </div>
                                <div className="vote">
                                    <p className="select-producer-label">SELECT PRODUCER</p>
                                    <Select className="select-producer" options={producerOptions} value={selectedProducer} onChange={(option) => this.selectProducer(option.value)}></Select>
                                    <Input className="amount" title="AMOUNT" type="text" value={amount} onChange={(e) => this.setState({ amount: e.target.value })} suffix="VOTE"></Input>
                                    <ul className="pick-amount list-inline">
                                        <li onClick={() => this.pickAmount(25)}>25%</li>
                                        <li onClick={() => this.pickAmount(50)}>50%</li>
                                        <li onClick={() => this.pickAmount(75)}>75%</li>
                                        <li onClick={() => this.pickAmount(100)}>100%</li>
                                    </ul>
                                    <p className="balance time">{voteBalance} VOTE</p>
                                    <div style={{ clear: "both" }}></div>
                                    <button className={`btn btn-color ${isLoading ? "btn-color-loading" : ""}`} onClick={() => this.vote()}>Vote</button>
                                </div>
                            </div>
                            {addressInfo && addressInfo.vote_infos.length > 0 &&
                                <div className="table table-voted">
                                    <div className={`unvote-overlay ${showUnvote ? "unvote-show" : ""}`}>
                                        <div className="wrapper">
                                            <Input className="unvote-amount" title="Unvote Amount" type="text" value={unvoteAmount} onChange={(e) => this.setState({ unvoteAmount: e.target.value })} suffix="VOTE"></Input>
                                            <div className="action">
                                                <span onClick={() => this.setState({showUnvote: false})}>Cancel</span>
                                                <span onClick={() => this.unvote()}>OK</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="table-header">
                                        <p className="title">PRODUCER VOTED</p>
                                    </div>
                                    <div className="table-title">
                                        <ul className="list-inline">
                                            <li>Rank</li>
                                            <li>Name</li>
                                            <li>Location</li>
                                            <li>Your Vote</li>
                                            <li></li>
                                        </ul>
                                    </div>
                                    <ul className="list-inline table-body">
                                        {
                                            addressInfo.vote_infos.map((value, index) => {

                                                const info = this.getInfo(value.option)
                                                let avatar = info.avatar ? info.avatar : "https://eosx-apigw.eosx.io/logo-proxy/producer/https%3A%2F%2Fimg.bafang.com%2Fcdn%2Fassets%2Fimgs%2FMjAxOTg%2FC3B8310FFC1B46DA82C8ED7910C2AD61.png"
                                                let name = info.name ? info.name : info.pubkey

                                                return (
                                                    <li key={index} className="table-row one-vote">
                                                        <ul className="list-inline">
                                                            <li>
                                                                <div className="top-number">{info.rank}</div>
                                                            </li>
                                                            <li>
                                                                <div className="name">
                                                                    <div className="thumbnail">
                                                                        <img className="logo" alt="witness" src={avatar}></img>
                                                                    </div>
                                                                    <div className="address">
                                                                        <a href={`/address/${info.address}`} className="text-truncate">{name}</a>
                                                                        <a href={`/address/${info.address}`} className="text-truncate time">{info.address}</a>
                                                                    </div>
                                                                </div>
                                                            </li>
                                                            <li>
                                                                <div className="location">
                                                                    <FlagIcon code={info.loc.toLowerCase()}></FlagIcon>
                                                                    <p>{Utils.countryCodeToContryName(info.loc)}</p>
                                                                </div>
                                                            </li>
                                                            <li><b>{Utils.formatCurrency(value.votes, 8)} VOTE</b></li>
                                                            <li>
                                                                <button onClick={() => this.showUnvote(info.address, value.votes)} className="btn btn-default">Unvote</button>
                                                            </li>
                                                        </ul>
                                                    </li>
                                                )
                                            })
                                        }
                                    </ul>
                                </div>
                            }
                        </div>
                    </div>
                </div>
            </section>
        )
    }
}

export default connect(state => ({
    addressInfo: state.app.addressInfo
}), ({
    setAddressInfo: setAddressInfo
}))(WalletVote)