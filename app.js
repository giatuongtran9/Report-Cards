const csv = require('csv-parser');
const fs = require('fs');

// remove the first two of the command line argument
const fileArgv = process.argv.slice(2);

const allData = {
    courses: [],
    students: [],
    tests: {},
    marks: []
}

// Read all the csv file and get its value to the 'allData' object
const readCsvFile = (argv) => (
    new Promise((resolve, reject) => {
    fs.createReadStream(`${__dirname}/${argv}`)
        .pipe(csv())
        .on('data', row => {
            if (Object.keys(row).length > 0) {
                switch (argv) {
                    case 'courses.csv':
                        allData.courses.push({id: parseInt(row.id), name: row.name, teacher: row.teacher})
                        break;
                    case 'students.csv':
                        allData.students.push({id: parseInt(row.id), name: row.name.trim()})
                        break;
                    case 'tests.csv':
                        allData.tests[row.id] = {id: parseInt(row.id), course_id: parseInt(row.course_id), weight: parseInt(row.weight)}
                        break;
                    case 'marks.csv':
                        allData.marks.push({test_id: parseInt(row.test_id), student_id: parseInt(row.student_id), mark: parseInt(row.mark)})
                        break;
                }
            }
        })
        .on('end', () => {
            resolve(allData)
        })

    }))

// Calculate the average mark for each course
function avgMark(marks, students, courses) {
    let avg = []
    let studentList = []
    students.map(student => {
        let markListFilter = marks.filter(x => x.student_id == student.id)
    
        courses.map(course => {
            let courseListFilter = markListFilter.filter(y => y.course_id == course.id)
            let avgCourse = 0;
            courseListFilter.map(c => {
                let m = c.mark * c.weight / 100
                avgCourse +=m
                
            })

            let tempAvg = parseFloat(avgCourse).toFixed(1)
            if (tempAvg > 0) {
                avg.push({
                    student: student,
                    course: course,
                    average: parseFloat(avgCourse).toFixed(1)
                })
        }
        })
        
    })
    return avg
}

let all = {
    students: []
}

async function displayReportCards(argv) {
    
    const data = await Promise.all(argv.map(arg => readCsvFile(arg)))

    const [{courses}, {students}, {tests}, {marks}] = data
    
    checkTestWeight(courses, tests)
    marks.map(mark => {
        mark.course_id = tests[mark.test_id].course_id
        mark.weight = tests[mark.test_id].weight
    })

    let avg = 0;
    
    const a = avgMark(marks, students, courses)
    if (a) { 
        students.forEach(student => {
            let selectedStudent = {}
            let newCourse = []
            let newList = a.filter(x => x.student.id == student.id)
            let sum = 0;

            // iterate through the formatted list to get the average mark
            // and create course array
            newList.forEach(list => {
                
                sum += parseFloat(list.average)
                avg = (sum / newList.length).toFixed(2)
                newCourse.push({
                    "id": list.course.id,
                    "name": list.course.name,
                    "teacher": list.course.teacher,
                    "courseAverage": list.average
                })

            })
            //All all to the new object and then push to 'all' array
            selectedStudent.id = student.id
            selectedStudent.name = student.name
            selectedStudent.totalAverage = parseFloat(avg)
            selectedStudent.course = newCourse
            all.students.push(selectedStudent)
            all.students.sort((a,b) => a.id - b.id)
        })
        
    }

    // Write to File using command line argument 4 (output.json)
    fs.writeFile(`${__dirname}/${argv[4]}`, JSON.stringify(all), error => {
        if (error) {
            console.log(error)
        }
        console.log('Compile Succesfully')
    })
 
}

// check if the weight is equal to 100
checkTestWeight = (courses, tests) => {
    Object.values(courses).map(course => {
        let courseWeight = 0;
        Object.values(tests).map(test => {
            if (test.course_id == course.id)
            {
                courseWeight += test.weight
            }
            course.courseWeight = courseWeight
        })
    })

    Object.values(courses).map(course => {
        if (course.courseWeight != 100) {
            console.log(new Error("Invalid course weight"))
            // if invalid then add error message to the JSON file
            all.students.push({"error": "Invalid course weight"})
        }
    })
}

displayReportCards(fileArgv)


