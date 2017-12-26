document.addEventListener("DOMContentLoaded", () => {
    const SVG_HEIGHT = 800
    const SVG_WIDTH = 2000
    const MARGIN = {
        LEFT: 20,
        RIGHT:20,
        TOP:20,
        BOTTOM:20
    }
    const SVG_INNER_HEIGHT = SVG_HEIGHT - MARGIN.TOP - MARGIN.BOTTOM
    const SVG_INNER_WIDTH = SVG_WIDTH - MARGIN.LEFT - MARGIN.RIGHT
    const CATEGORY_WIDTH = SVG_INNER_WIDTH / 4
    const FACETING_CHART_HEIGHT = 200
    const FACETING_CHART_WIDTH = 1400
    const MIN_RATING = 0.0
    const MAX_RATING = 5.0

    function transformDate(business) {
        business.forEach(element => {
            element.quarters.forEach(ele => {
                ele.quarter = new Date(ele.quarter)
            })
        })
        return business
    }

    function groupByCategory(business) {
        let categoryData = d3.nest().key(d => d.category)
                    .entries(business)
                    .map(d => {return {category: d.key, count: d.values.length, restaurants:d.values}})
        
        return categoryData.sort((data1, data2) => d3.descending(data1.count, data2.count))
    }

    function sortRatingByTime(business) {
        business.forEach(element => {
            element.quarters.sort((data1, data2) => {
                return data1.quarter - data2.quarter
            })
        })
        return business
    }

    function calculateAverageRating(business) {
        let resCount = 0
        let ratingTotal = 0
        business.forEach(d => {
            d.quarters.forEach(ele => {
                resCount += 1
                ratingTotal += ele.rating
            })
        })
        return ratingTotal / resCount
    }

    function drawCategoryData(selector, categoryData) {
        let maxCount = d3.max(categoryData, d => d.count)
        let lenScale = d3.scaleLinear()
                        .range([0, CATEGORY_WIDTH])
                        .domain([maxCount, 0])
        let categoryScale = d3.scaleBand()
                        .range([0, SVG_INNER_HEIGHT])
                        .domain(categoryData.map(d => d.category))
                        .padding(0.2)
        let colorScale = d3.scaleOrdinal(d3.schemeCategory20)

        let container = d3.select(selector)
        container.append("g")
            .attr("transform", `translate(${MARGIN.LEFT},${MARGIN.TOP})`)
            .selectAll("rect")
            .data(categoryData)
            .enter()
                .append("rect")
                .attr("x", d => CATEGORY_WIDTH - lenScale(maxCount - d.count))
                .attr("y", d => categoryScale(d.category))
                .attr("width", d => lenScale(maxCount - d.count))
                .attr("height", d => categoryScale.bandwidth())
                .attr("fill", d => colorScale(d.category))
                .append("title")
                    .text(d => `${d.category}`)
        
        let xAxis = d3.axisBottom(lenScale)
                    .tickFormat(v => +v)
        let yAxis = d3.axisLeft(categoryScale)

        d3.select(selector)
            .append("g")
                .attr("transform", `translate(${MARGIN.LEFT},${SVG_INNER_HEIGHT+MARGIN.TOP})`)
                .call(xAxis)
                .append("text")
                    .text("Count")
                    .attr("dx", CATEGORY_WIDTH / 2)
                    .attr("dy", -10)
                    .attr("text-anchor", "middle")
                    .attr("alignment-baseline", "text-before-edge")
                    .attr("fill", "black")
        
        let xEnd = lenScale(0)
        d3.select(selector)
            .append("g")
                .attr("transform", `translate(${MARGIN.LEFT + xEnd},${MARGIN.TOP})`)
                .call(yAxis)
                .append("text")
                    .text("Restaurant Type")
                    .attr("dx", 0)
                    .attr("dy", 0)
                    .attr("text-anchor", "end")
                    .attr("alignment-baseline", "text-before-edge")
                    .attr("fill", "black")

        return {categoryScale:categoryScale, xStart:xEnd}
    }

    function drawRestaurantOfSameCategory(selector, restaurants, xStart, yStart, chart_width, chart_height, avgRating) {
        // console.log(xStart, yStart)
        for (let i = 0;i < restaurants.length;i++) {
            let restaurant = restaurants[i]
            let timeRange = d3.extent(restaurant.quarters, d => d.quarter)
            let chartXStart = xStart + i * (chart_width + MARGIN.LEFT)
            let chartXEnd = chartXStart + chart_width
            let xScale = d3.scaleTime()
                .range([chartXStart, chartXEnd])
                .domain(timeRange)

            let chartYStart = yStart
            let chartYEnd = chartYStart + chart_height
            let yScale = d3.scaleLinear()
                .range([chartYStart, chartYEnd])
                .domain([5.0, 0.0])
            let xAxis = d3.axisBottom(xScale)
                .ticks(restaurant.quarters.length)
                .tickFormat(v => {
                    if (v.getDate() != 1) {
                        console.error("assertion error: day->" + v.getDate())
                        return
                    }
                    let season = ""

                    let year = v.getFullYear()
                    let monthIndex = v.getMonth()
                    if (monthIndex == 0) {
                        season = "Q1"
                    } else if (monthIndex == 3) {
                        season = "Q2"
                    } else if (monthIndex == 6) {
                        season = "Q3"
                    } else if (monthIndex == 9) {
                        season = "Q4"
                    } else {
                        console.error("assertion error: month->" + monthIndex)
                    }
                    return year.toString().slice(2,4) + season
                })
            let yAxis = d3.axisLeft(yScale)
                            .ticks(6)
                            .tickFormat(v => +v)
            
            d3.select(selector)
                .append("line")
                .attr("x1", MARGIN.LEFT + chartXStart)
                .attr("x2", MARGIN.LEFT + chartXEnd)
                .attr("y1", yScale(avgRating) - chart_height)
                .attr("y2", yScale(avgRating) - chart_height)
                .attr("stroke", "red")
                .attr("stroke-width", "2")
            
            d3.select(selector)
                .append("text")
                     .attr("transform", `translate(${MARGIN.LEFT + chartXEnd}, ${yScale(avgRating) - chart_height})`)
                    .text("avg:" + avgRating)
                        .attr("text-anchor", "start")
                        .attr("alignment-baseline", "central")
                        .attr("stroke", "red")

            const ratingLine = d3.line()
                .x(d => {return xScale(d.quarter)})
                .y(d => {return yScale(d.rating)})
            
            d3.select(selector)
                .append("g")
                    .attr("transform", `translate(${MARGIN.LEFT}, ${-chart_height})`)
                    .append("path")
                    .datum(restaurant.quarters)
                    .attr("fill", "none")
                    .attr("stroke", "black")
                    .attr("d", ratingLine)
                    .attr("text-anchor", "start")
                        .attr("alignment-baseline", "hanging")
            
            d3.select(selector)
                .append("g")
                    .attr("transform", `translate(${MARGIN.LEFT},${yStart})`)
                    .call(xAxis)
                    .append("text")
                        .text(restaurant.business_name)
                        .attr("dx", xStart + chart_width / 2)
                        .attr("dy", -20)
                        .attr("text-anchor", "start")
                        .attr("alignment-baseline", "hanging")
                        .attr("fill", "black")
            d3.select(selector)
                .append("g")
                    .attr("transform", `translate(${xStart + MARGIN.LEFT},${-chart_height})`)
                    .call(yAxis)
            break
        }
    }

    function drawTimeline(selector, business, categoryData, categoryRet) {

        let categoryScale = categoryRet.categoryScale
        let xCoordinate = categoryRet.xStart

        d3.select(selector)
                .append("g")
                    .attr("transform", `translate(${xCoordinate + MARGIN.LEFT},${10})`)
                    .append("text")
                        .text("Rating")
                        .attr("dx", 0)
                        .attr("dy", 13)
                        .attr("text-anchor", "start")
                        .attr("alignment-baseline", "central")
                        .attr("fill", "black")
                    
        categoryData.forEach(d => {
            let yCoordinate = categoryScale(d.category)
            drawRestaurantOfSameCategory(
                selector,
                d.restaurants,
                MARGIN.LEFT + xCoordinate,
                MARGIN.TOP + yCoordinate + categoryScale.bandwidth(),
                FACETING_CHART_WIDTH,
                categoryScale.bandwidth(),
                calculateAverageRating(business)
            )
        })
    }

    function loadData(selector) {
        d3.json("Las Vegas Business.json", (err, business) => {
            if (!err) {
                let categoryData = groupByCategory(sortRatingByTime(transformDate(business)))
                let categoryRet = drawCategoryData(selector, categoryData)
                drawTimeline(selector, business, categoryData, categoryRet)
            } else {
                console.error(err)
            }
        })
    }
    

    function main(selector){
        //Main function
        //Set the width and height of the charts SVG
        d3.selectAll(selector)
            .attr("width", SVG_WIDTH)
            .attr("height", SVG_HEIGHT)

        //Load the data
        loadData(selector)
    }

    main("#vis")
})