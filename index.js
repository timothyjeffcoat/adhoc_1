const fs = require('fs')
const SILVER = 'Silver'
let sfile = 'slcsp.csv'
let zfile = 'zips.csv'
let pfile = 'plans.csv'

// file to fill with rate in second column
let sdata = fs.readFileSync(sfile, 'utf8').split('\n')
// zip codes
let zdata = fs.readFileSync(zfile, 'utf8').split('\n')
// plans
let pdata = fs.readFileSync(pfile, 'utf8').split('\n')
// create filtered array of zipcodes from slcsp
let filteredSdata = sdata.map((data)=>{
    return data = data.replace(/,/g, '')
}).filter( data => {
    if(data === "" || data.startsWith('zipcode')) return false
    return true
})
// filter out the zdata (zips) to only be the ones in filteredSdata
let filteredZips = zdata.filter((zip) => {
    let rowarray = zip.split(",")
    if(Number(rowarray[0])){
        for(let x=0;x<filteredSdata.length;x++){
            if(rowarray[0] == ''+filteredSdata[x]){
                return true
            }
        }
    }
    return false
})
// create a json array for zip data
let filteredZipsArea = filteredZips.map( data => {
    let newdata = data.split(',')
    const [zipcode, state, countycode, name, area] = newdata
    return {
        zipcode,
        state,
        countycode,
        name,
        area
    }
})
// create json array and add zip to plans data
let planJson = []
pdata.forEach((row) => {
    let rowarray = row.split(',')
    let datarow = {}
    for(let x = 0;x<rowarray.length;x++){
        const [plan_id, state, metal, rate, area] = rowarray
        if(plan_id === 'plan_id') continue
        datarow.plan_id = plan_id
        datarow.state = state
        datarow.metal_level = metal
        datarow.rate = parseFloat(rate)
        datarow.rate_area = area
        let foundZA = filteredZipsArea.filter(item => item.area === area && item.state === state)

        if(foundZA !== undefined && foundZA.length > 0){
            datarow.zipcode = foundZA.filter(item => item.zipcode)
            planJson.push(datarow)
        }
    }
})

// for each line in filteredSdata find the list of silver plans, base on zip fom planJson
let finalArray = new Array()
for(let x = 0; x< filteredSdata.length; x++){
    let zip = filteredSdata[x]
    let foundZA = filteredZipsArea.find(item => item.zipcode === zip)
    const filterd = planJson.filter( (data) => {
        if(
            data.metal_level === SILVER &&
            data.state === foundZA.state &&
            data.zipcode.find(item => item.zipcode === zip)
        ){
            return true
        }
        return false
    })
    if(filterd.length === 0){
        // ASSIGN EMPTY TO THE ZIPCODE in the corrected_slcsp.csv
        let secondsmallest = 0
        finalArray.push({
            zip,
            rate: ''
        })
    } else{
        filterd.sort( (itemA, itemB) => {
            return parseFloat(itemA.rate) > parseFloat(itemB.rate)
        })

        // compute the second lowest silver plan from filterd data
        let nCompare = 0
        let smallest = parseFloat(filterd[0].rate)
        let secondsmallest = parseFloat(filterd[0].rate)
        for(let i = 1; i < filterd.length; ++i) {
            ++nCompare
            if(parseFloat(filterd[i].rate) < secondsmallest) {
                ++nCompare
                if(parseFloat(filterd[i].rate) < smallest) {
                    secondsmallest = smallest
                    smallest = parseFloat(filterd[i].rate)
                }
                else
                    secondsmallest = parseFloat(filterd[i].rate)
            }
        }
        finalArray.push({
            zip,
            rate: Number.parseFloat(secondsmallest).toFixed(2).toLocaleString()
        })
    }
}
// ASSIGN secondsmallest TO THE ZIPCODE in the corrected_slcsp.csv
let writeStream = fs.createWriteStream('corrected_slcsp.csv')
let newLine = []
newLine.push("zip")
newLine.push("rate")

writeStream.write(newLine.join(',')+ '\n')

finalArray.forEach((someObject, index) => {
    let newLine = []
    newLine.push(someObject.zip)
    newLine.push(someObject.rate)
    writeStream.write(newLine.join(',')+ '\n')
})
// finish writing to the file
writeStream.end()

writeStream.on('finish', () => {
    console.log('finished writing stream')
}).on('error', (err) => {
    console.log(err)
})




