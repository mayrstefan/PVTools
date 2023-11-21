/**
 * @return {Object) Functions: energyFlow, calculateConsumption, normalizeHourlyRadiation
 * 
 */


/**
 * Calculate consumption per hour from a load profile, year and an yearly consumption
 * @param  {Int} powerGeneration             watts for one hour
 * @return {Object}                         {newBatterySoc: 3560, ...}
 
Parameters object:
    powerGeneration: 503 (watts for one hour)
    energyConsumption: 433 (watts for one hour)
    batterySoC: 3450 (watthours)
    batterySocMax: 5500 (watthours)
    batterySocMin: 100 (watthours)
    batteryEfficiency / batteryLoadEfficiency: 0.99 (99%)
    batteryUnloadEfficiency (optinal): 0.99 (99%)
    maxPowerGenerationInverter (optional): 2500 (watts)
    maxPowerGenerationBattery: (optional): 3400 (watts)
    maxPowerLoadBattery (optional): 2300 (watts)
    maxPowerFeedIn (optional): 8500 (watts) for feedIn regulations (70% rule in germany)
    dayTime (optional): to identify this time
Return object:
    newBatterySoc: 3560 (watthours)
    selfUsagePowerPv: 3550 (watthours) PV-power, that used for own consumption
    selfUsagePowerBattery: 2250 (watthours) Battry-power, that used for own consumption
    selfUsagePower: 5520 (watthours) sum Pv + Battery
    feedInPowerGrid: 3445 (watthours) 
    batteryLoad: 2520 / -2520 (watthours) load/unload battery
    consumptionGrid: 2450 (watthours) 
    dayTime (optional): to identify this time

    missedFeedInPowerGrid, missedInverterPower, missedBatteryPower;


missing calculations parameters:

missing return values:
    missed feedin power wehen maxPowerFeedIn is set
    missed PV power, when maxPowerGenerationInverter is set
    missed battery power, when maxPowerLoadBattery or maxPowerGenerationBattery is set
*/



const energyFlow = ( {
		energyGeneration, 
        energyConsumption, 
        batterySoc, 
        batterySocMax, 
        batterySocMin, 
        batteryEfficiency, 
        batteryLoadEfficiency, 
        batteryUnloadEfficiency,
        maxPowerGenerationInverter,
        maxPowerGenerationBattery,
        maxPowerLoadBattery,
        maxPowerFeedIn,
        dayTime,
		regressionDb
    } ) => {
    
    let 
		gridEnergyFeedIn = 0, 
		selfUsedEnergyPV = 0,
		selfUsedEnergyBattery = 0,
		missedFeedInPowerGrid = 0, 
		missedInverterPower = 0, 
		missedBatteryPower = 0, 
		newBatterySoc = batterySoc;
    
    const powerProduction = energyGeneration

    batteryLoadEfficiency = batteryLoadEfficiency || batteryEfficiency || 1
    batteryUnloadEfficiency = batteryUnloadEfficiency || batteryEfficiency || 1

	if (maxPowerGenerationInverter && maxPowerGenerationInverter < energyGeneration) {
		
	    missedInverterPower = energyGeneration - maxPowerGenerationInverter
	    energyGeneration = maxPowerGenerationInverter
	}

	const MIN_ENERGY_OFFER = 0

    const energyOffer = (newBatterySoc-batterySocMin)*batteryUnloadEfficiency + energyGeneration < MIN_ENERGY_OFFER ? 0 : (newBatterySoc-batterySocMin)*batteryUnloadEfficiency + energyGeneration
	if(energyOffer == 0) {
		const freeBatteryCapacity = batterySocMax - batterySoc
		if (batterySoc >= batterySocMax ) {
			gridEnergyFeedIn = gridEnergyFeedIn + energyGeneration
		} else if (freeBatteryCapacity > energyGeneration) {
			newBatterySoc = newBatterySoc + energyGeneration
		} else {
			newBatterySoc = batterySocMax 
			gridEnergyFeedIn = gridEnergyFeedIn + energyGeneration - freeBatteryCapacity
		}
	}

	let {selfUsedEnergy, gridUsedEnergy} = regressionCalc({regressionDb, energyConsumption, energyOffer})
	

	if(energyGeneration >= selfUsedEnergy) {
		const freeBatteryCapacity = batterySocMax - newBatterySoc
		selfUsedEnergyPV = selfUsedEnergy
		if (freeBatteryCapacity <= 0) {
			selfUsedEnergyBattery = 0
			newBatterySoc = batterySocMax
			gridEnergyFeedIn = gridEnergyFeedIn + energyGeneration - selfUsedEnergyPV
		} else if(freeBatteryCapacity >= energyGeneration - selfUsedEnergyPV) {
			newBatterySoc = newBatterySoc + energyGeneration - selfUsedEnergyPV
		} else if (freeBatteryCapacity < energyGeneration - selfUsedEnergyPV) {
			newBatterySoc = batterySocMax
			gridEnergyFeedIn = gridEnergyFeedIn + energyGeneration - selfUsedEnergyPV - selfUsedEnergyBattery
		}
	} else if (energyGeneration < selfUsedEnergy ) {
		selfUsedEnergyPV = energyGeneration
		const batteryCapacity = newBatterySoc - batterySocMin 
		const neededEnergy = selfUsedEnergy - selfUsedEnergyPV
		if(batteryCapacity == 0) {
		} else if(batteryCapacity >= neededEnergy) {
			selfUsedEnergyBattery = neededEnergy
			newBatterySoc = newBatterySoc - neededEnergy
		} else if (batteryCapacity < neededEnergy) {
			selfUsedEnergyBattery = newBatterySoc - batterySocMin
			newBatterySoc = batterySocMin
			gridUsedEnergy = neededEnergy - selfUsedEnergyBattery

		}
	}


	const batteryLoadEnergy = batterySoc - newBatterySoc
			
	// console.log({
	// 	dayTime,
	// 	// freeBatteryCapacity,
	// 	energyGeneration,
	// 	energyConsumption,
	// 	energyOffer,
	// 	powerProduction,
	// 	selfUsedEnergy,
	// 	selfUsedEnergyBattery,
	// 	selfUsedEnergyPV,
	// 	gridUsedEnergy,
	// 	gridEnergyFeedIn,
	// 	maxPowerGenerationInverter, 
	// 	// multiplicator,
	// 	// maxEnergyOffer,
	// 	batterySoc,
	// 	newBatterySoc,
	// 	batterySocMin,
	// 	batterySocMax
	// })

	

	return {
		newBatterySoc,
        powerGeneration: energyGeneration,
        powerConsumption: energyConsumption,
        powerProduction,
        selfUsedEnergy,
        selfUsagePowerPv: selfUsedEnergyPV,
        selfUsagePowerBattery: selfUsedEnergyBattery,
        feedInPowerGrid: gridEnergyFeedIn,
        batteryLoad: batteryLoadEnergy,
        gridUsedEnergy,
        missedInverterPower,
        missedBatteryPower,
        missedFeedInPowerGrid,
        dayTime: dayTime ? dayTime : ''
	}

    
    // if (energyGeneration > energyConsumption) {
    //     // if power generaton is more then consumption, self used power is used complete and battery SoC will be calculated
    //     selfUsagePowerPv = energyConsumption
    //     selfUsagePowerBattery = 0
    //     const excessPower = energyGeneration - energyConsumption
    //     consumptionGrid = 0
        
    //     if (batterySoc >= batterySocMax) {
    //         // if battery is full, all power will be feed in
    //         feedInPowerGrid = excessPower
    //         newBatterySoc = batterySoc
    //         batteryLoad = 0
    //     } else if (batterySoc + (excessPower * batteryLoadEfficiency) > batterySocMax) {
    //         // if power would overload the battery, power split into feed in and battery loading
    //         batteryLoad = batterySocMax - batterySoc
    //         if (maxPowerLoadBattery && maxPowerLoadBattery < batteryLoad) {batteryLoad = maxPowerLoadBattery}
    //         feedInPowerGrid = (excessPower - (batteryLoad)) * batteryLoadEfficiency // feedin ist reduced due the missing LoadEfficiency in battery Load
    //         newBatterySoc = batterySoc + batteryLoad
    //     } else {
    //         // if battery has enough capacity to save the power, no feed in, all power save in battery
    //         feedInPowerGrid = 0
    //         batteryLoad = excessPower * batteryLoadEfficiency
    //         if (maxPowerLoadBattery && maxPowerLoadBattery < batteryLoad) {
    //             batteryLoad = maxPowerLoadBattery
    //             feedInPowerGrid = (excessPower - batteryLoad) * batteryLoadEfficiency
    //         }
    //         newBatterySoc = batterySoc + batteryLoad
    //     }
        
        
    // }
    // else if (energyGeneration < energyConsumption) {
    //     // if power generaton is less then consumption, self used power is only the genaration and battery Soc will be calculated
    //     selfUsagePowerPv = energyGeneration
    //     feedInPowerGrid = 0
    //     const excessLoad = energyConsumption - energyGeneration

    //     if (batterySoc == batterySocMin) {
    //         // if battery is empty, full grid consumption
    //         consumptionGrid = excessLoad
    //         newBatterySoc = batterySocMin
    //         batteryLoad = 0
    //         selfUsagePowerBattery = 0

    //     } else if (batterySoc - ((excessLoad) / batteryUnloadEfficiency) < batterySocMin) {
    //         // if battery will be empty, grid consumption and battery will be splitted 
            
    //         consumptionGrid = (excessLoad - batterySoc + batterySocMin) / batteryUnloadEfficiency
    //         newBatterySoc = batterySocMin
    //         batteryLoad = batterySocMin - batterySoc
    //         selfUsagePowerBattery = batterySoc - batterySocMin
    //         if(maxPowerGenerationBattery && maxPowerGenerationBattery < batteryLoad *-1 ) {
    //             batteryLoad = maxPowerGenerationBattery / batteryUnloadEfficiency *-1
    //             consumptionGrid = excessLoad - maxPowerGenerationBattery
    //             selfUsagePowerBattery = maxPowerGenerationBattery
    //             newBatterySoc = batterySoc + batteryLoad
    //         }
            
            
    //         // battrySoc load  batterymin
    //         //    200     500     100
    //         // 400 consumption (load(/batteryUnloadEfficiency) - batterySoc + batterySocMin )
    //     } else {
    //         // if battery has enough power, only use battery
    //         consumptionGrid = 0
    //         batteryLoad = excessLoad / batteryUnloadEfficiency * -1
    //         selfUsagePowerBattery = excessLoad
    //         if(maxPowerGenerationBattery && maxPowerGenerationBattery < batteryLoad *-1 ) {
    //             batteryLoad = maxPowerGenerationBattery / batteryUnloadEfficiency *-1
    //             consumptionGrid = excessLoad - maxPowerGenerationBattery
    //             selfUsagePowerBattery = maxPowerGenerationBattery
    //         }
    //         newBatterySoc = batterySoc + batteryLoad
    //     }

    // }
    // else if (energyGeneration == energyConsumption) {
    //     selfUsagePowerPv = energyConsumption
    //     selfUsagePowerBattery = 0
    //     newBatterySoc = batterySoc
    //     feedInPowerGrid = 0
    //     batteryLoad = 0
    //     consumptionGrid = 0

    // }

    // // 
    // selfUsagePower = selfUsagePowerPv + selfUsagePowerBattery
    // if (maxPowerFeedIn < feedInPowerGrid) {
    //     missedFeedInPowerGrid = feedInPowerGrid - maxPowerFeedIn
    //     feedInPowerGrid = maxPowerFeedIn

    //     // console.log(missedFeedInPowerGrid)
    //     // console.log(maxPowerFeedIn)
    //     // console.log(feedInPowerGrid)
    // }

    // return {
    //     newBatterySoc,
    //     energyGeneration,
    //     energyConsumption,
    //     powerProduction,
    //     selfUsagePower,
    //     selfUsagePowerPv,
    //     selfUsagePowerBattery,
    //     feedInPowerGrid,
    //     batteryLoad,
    //     consumptionGrid,
    //     missedInverterPower,
    //     missedBatteryPower,
    //     missedFeedInPowerGrid,
    //     dayTime: dayTime ? dayTime : ''
    // }

}

/**
 * Calculate consumption per hour from a load profile, year and an yearly consumption
 * @param  {Object} loadProfile             Loadprofile Object {name: "SLPH0", values: [{ month: 1, weekDay: 1, dayHour: 0, partPerMonth: 0.004096433, partPerYear: 0.000406886 },...]}
 * @param  {Int}   year                     The year which should be calculated (leap year in mind)
 * @param  {Int}   consumptionKwhPerYear    Consumption in this year in kWh
 * @return {Object}                         {"20200101:00":{P:20}, "20200101:01":{P:30.5}, ...}
 */

const calculateConsumption = ({year, consumptionYear, profile, profileBase = 1000, factorFunction}) => {

    // IF profil is based on 1000kWh per year, it must be multiplied by difference of real consumption (e.g. 5000kWh = multiplier 5x)
    const consumptionFactor = consumptionYear / profileBase
    let currentDay = new Date(Date.UTC(year,    0, 1,0,0))
    const lastDay = new Date(Date.UTC(year + 1, 0, 1,0,0))
    
    const days = {}
    // Needed for factorFunction "Standardlastprofil BDEW"
    let dayTimer = 1

    while (currentDay <= lastDay) {
        
        
        let currentProfile = profile
        .find(season => new Date(season.till + "/" + year ) >= currentDay) // TODO/BUG: this finds the next season one day earlier (03/21 is falsy at currentDay 03/21)

        if (!currentProfile) {                  //TODO/BUG: The date "till: 12/31" aren't find correctly.
            currentProfile = profile
            .find(season => season.last)
    
        } 

        for (let hour = 0; hour < 24; hour++) {

            const timeString = `${year}${('00' + (currentDay.getMonth() + 1)).slice(-2)}${('00' + (currentDay.getDate())).slice(-2)}:${('00' + hour).slice(-2)}`
            let consumption
            switch (currentDay.getDay()) {      // find the right day for profile | 0 = sun, 1 = mon, ..., 6 = sat
                case 0:
                    consumption = currentProfile.profileDays['sun'][hour] || currentProfile.profileDays['default'][hour] 
                    break;
                case 6:
                    consumption = currentProfile.profileDays['sat'][hour] || currentProfile.profileDays['default'][hour] 
                    break;
                    
                default:
                    consumption = currentProfile.profileDays['weekdays'][hour] || currentProfile.profileDays['default'][hour] 
                    break;
            }
            
            if (factorFunction){                // if function set, use function for "Standardlastprofil BDEW"

                days[timeString] = {P:factorFunction(dayTimer, consumption * consumptionFactor)} 
            }
            else {
                
                days[timeString] = {P:consumption * consumptionFactor}
            }
            
        }
        currentDay.setDate(currentDay.getDate() + 1)    // set one day after
        dayTimer++

    } 
    return days
}

/**
 * normalize the hourly radiation from pvgis API
 * @param  {Array[Array]} hourlyRadiationArrays An Array with power generation e.g. two: [ [{ "time": "20200101:0010", "P": 20.0, ... },{ "time": "20200101:0110", "P": 20.0, ... }],[...] ]
 * @return {Array[Object]} Array with Objects in Fomrat [ [{"20200101:00":{P:20}, "20200101:01":{P:30.5}, ...}], [{...}, ...] ]
*/

const normalizeHourlyRadiation = hourlyRadiationArray => {

    const normRadiation = hourlyRadiationArray.reduce((prev, curr) => {
            const dateHour = curr.time.split(':')[0] + ':' + curr.time.split(':')[1].substr(0,2)
            if (prev[dateHour]) {
                prev[dateHour].P += curr.P
            } else {
                prev[dateHour] = {P: curr.P, temperature: curr.T2m}
            }

            return prev
        },{})

    return normRadiation
}


/**
 * merge powerGeneration to one summerized object
 * @param  {Array[Object]} powerGenerationArray An Array with power generation e.g. two: [ {"20200101:00":{P:20}, "20200101:01":{P:30.5}, ...}, {...} ]
 * @return {Object} Array with Objects in Fomrat {"20200101:00":{P:20}, "20200101:01":{P:30.5}, ...}
*/

const mergePowerGeneration = powerGenerationArray => {
    if (powerGenerationArray.length == 1) return powerGenerationArray[0]

    return powerGenerationArray.reduce((prev, curr) => {

        for (const [key, value] of Object.entries(curr)) {

            if (prev[key]) {
                prev[key].P += value.P
            } else {
                prev[key] = {P: value.P, temperature: value.temperature}
            }
        }

        return prev
    }, {})

}


/**
 * generate the order of days for one year
 * @param  {Int} year A year: 2020
 * @return {Array} Array with DayTime  ["20200101:00","20200101:01","20200101:02", ... ,"20201231:23"]
*/

const generateDayTimeOrder = year => {
    const daysFebruary = new Date(year, 2, 0).getDate()
    const months = [1,2,3,4,5,6,7,8,9,10,11,12]
    const monthLength = [31, daysFebruary, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

    const timeString = []

    months.map((month, i) => {
        
        const mLength = monthLength[i]
        Array.from(Array(mLength).keys()).map(day => {
            day += 1
            Array.from(Array(24).keys()).map(hour => {
                timeString.push(`${year}${('00' + (month)).slice(-2)}${('00' + day).slice(-2)}:${('00' + hour).slice(-2)}`)
                
            })
            

        })
        
        

    })
    return timeString
}

/**
 * generate array with merged power generation + calculated power consumption within day time aray
 * @param  {Int} year A year: 2020
 * @return {Array} Array with Objects  [{dayTime: "20200101:00", P: 220, consumption: 350, temperature:10.3},{dayTime: "20200101:01", P: 20, consumption: 450}, ... ]
*/

const generateDayTimeValues = ({consumption, powerGeneration, year}) => {
    return generateDayTimeOrder(year).reduce((prev, curr) => {
        if (powerGeneration[curr] && consumption[curr]){
            return [...prev, 
                {
                    dayTime: curr,
                    P: powerGeneration[curr].P,
                    temperature: powerGeneration[curr].temperature,
                    consumption: consumption[curr].P
                }
            ]
        }
        else {
            return prev
        }
    },[])
    
}



const regressionCalc = ({regressionDb, energyConsumption, energyOffer }) => {

	const multiplicator = Math.min(energyConsumption, energyOffer)
	if (multiplicator == 0 ) return {
		selfUsedEnergy: 0,
		gridUsedEnergy: energyConsumption,
	}
    const lastRegression = Object.keys(regressionDb)[Object.keys(regressionDb).length-1]
	const regressionKey = Math.floor(energyConsumption / 50)*50
    const regression = regressionDb[regressionKey] ? regressionDb[regressionKey] : lastRegression 

    const selfUsedEnergy = Object.keys(regression)
            .reduce((acc, curr) => {
				const power = parseInt(curr) + 25
				const value = regression[curr]
				return acc + Math.min(energyOffer/power,1) * value * energyConsumption

            },0)
	
	const gridUsedEnergy = energyConsumption - Math.min(selfUsedEnergy,energyOffer)
        
    return {
		selfUsedEnergy,
		gridUsedEnergy
	}
}

// const regressionCalc = ({regressionDb,maxPowerGenerationInverter = 999999999 , energyConsumption, multiplicator }) => {

//     // energyConsumption = 470Wh
//     // maxPowerGenerationInverter = 999999
// 	// multiplicator = 106,96 
// 	if (multiplicator == 0 ) return 0
//     const lastRegression = Object.keys(regressionDb)[Object.keys(regressionDb).length-1]
//     // finde in Matrix die 100
// 	const regression = regressionDb[Math.floor(energyConsumption / 50)*50] ? regressionDb[Math.floor(energyConsumption / 100)*100] : lastRegression 
	
// 	// nutze Min(WRLeistung, multiplicator) = 106,96
// 	const minPower = maxPowerGenerationInverter > multiplicator ? multiplicator : maxPowerGenerationInverter
// 	const minPowerFloor = Math.floor(minPower / 100)*100
//     const powerProduction = Object.keys(regression)
// 		.reduce((acc, curr) => {
// 			const key = parseInt(curr)
// 			const value = regression[key]
// 			if (minPower >= key){ // 106,96 > 0, 106,96 > 100 
// 				if (minPowerFloor == key) return acc + minPower * value // floor(106,96) 100 == key --- 106,96*0.0028530
// 				return acc + ((key + 25) * value) // 106,96 > 0 --- (0+50)*0.0000850
// 			}
// 			return acc + (minPower * value)  // 106,96*0.0471 ... 106,96*0.14986 ....
// 		},0)
//     // powerProduction = 350
// 	console.log({energyConsumption, multiplicator, minPower, powerProduction})
        
//     return powerProduction
// }

module.exports = {
    energyFlow,
    calculateConsumption,
    normalizeHourlyRadiation,
    mergePowerGeneration,
    generateDayTimeValues,
    generateDayTimeOrder,
    regressionCalc
}