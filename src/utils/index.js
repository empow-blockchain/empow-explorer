
import countries from './countries.json'
import convertActionContent from './convertActionContent'

const Utils = {
    formatCurrency(amount, decimalCount = 8, decimal = ".", thousands = ",") {
        decimalCount = Math.abs(decimalCount);
        decimalCount = isNaN(decimalCount) ? 8 : decimalCount;

        const negativeSign = amount < 0 ? "-" : "";

        let i = parseFloat(parseInt(amount = Math.abs(Number(amount) || 0).toFixed(decimalCount)).toString()).toString()
        let j = (i.length > 3) ? i.length % 3 : 0;

        let decimalPart = decimalCount ? Math.abs(amount - i).toFixed(decimalCount).slice(2) : ""
        decimalPart = '0.' + decimalPart

        if (parseFloat(decimalPart) === 0) {
            decimalPart = ''
        } else {
            decimalPart = parseFloat(decimalPart).toString().substring(1, decimalPart.length)
        }

        return negativeSign + (j ? i.substr(0, j) + thousands : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousands) + decimalPart;
    },

    convertDate(nanoTime) {
        var timestamp = nanoTime / 10**9
        var a = new Date(timestamp * 1000);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var year = a.getFullYear();
        var month = months[a.getMonth()];
        var date = a.getDate();
        var hour = a.getHours();
        var min = a.getMinutes();
        var sec = a.getSeconds();
        var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec;
        return time;
    },

    countryCodeToContryName(code) {
        const filter = countries.filter(value => {return value.code === code})
        if(filter.length === 0) return "Unknown"
        return filter[0].name
    },

    getTransactionErrorMessage(message) {
        let regex = /Stack tree: \nError: (.*)/gm;
        let m = regex.exec(message)

        if(m && m[1]) return m[1]

        regex = /error: (.*)/gm;
        m = regex.exec(message)

        if(m && m[1]) {
            try {
                const json = JSON.parse(m[1])
                return json.message
            } catch {
                return m[1]
            }
        }

        return message
    },

    properCase(string) {
        return string.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    },

    checkNormalUsername(username) {
        if(username.length < 6 || username.length > 32) {
            return "Username length must 6-32 characters"
        }
        for (let i in username) {
            let ch = username[i];
            if (!(ch >= 'A' && ch <= 'z' || ch >= '0' && ch <= '9')) {
                return "username invalid. username contains invalid character > " + ch
            }
        }

        return true
    },

    sendAction(tx, gasLimit = 100000, type = "success") {
        return new Promise( (resolve, reject) => {
            tx.addApprove("*", "unlimited")
            tx.setGas(1, gasLimit)

            if(!window || !window.empow) {
                return reject("Please install Empow Wallet Extension")
            }

            const handler = window.empow.signAndSend(tx)
    
            handler.on("failed", async (error) => {
                // check if pay ram fail -> buy ram
                let errorMessage = this.getTransactionErrorMessage(error)
                errorMessage = errorMessage.message ? errorMessage.message : errorMessage

                if(errorMessage.includes("pay ram failed")) {
                    const ramNeed = errorMessage.match(/need\s(.*),/)[1]
                    const address = await window.empow.enable()
                    const txBuyRam = window.empow.callABI("ram.empow", "buy", [address, address, parseInt(ramNeed)])

                    this.sendAction(txBuyRam).then( () => {
                        this.sendAction(tx).then(res => resolve(res)).catch(error => reject(error))
                    })
                } else {
                    reject(this.getTransactionErrorMessage(error))
                }
            })
            
            if(type ===  "success") {
                handler.on("success", (res) => {
                    resolve(res)
                })
            }

            if (type ===  "pending") {
                handler.on("pending", (tx_hash) => {
                    resolve({tx_hash})
                })
            }
            
        })
    },

    convertActionContent: convertActionContent
}

export default Utils