import express from 'express';
import db from '../models/mysqlDatabase';
const router = express.Router();

// /api/classroom/project/*

/* 프로젝트 가져오기 */
router.get('/', (req, res) => {
  let loginInfo = req.session.loginInfo;
  let classID = req.query.classID;

  if (typeof classID === 'undefined') {
    return res.status(400).json({
      error: "Undefined classID",
      code: 1
    });
  }

  let query = '';

  if (loginInfo.type == 'professor') {
    // 교수일 시
    //if (typeof projectID === 'undefined') {

    // 수업 내 전체 프로젝트 조회
    let params = [loginInfo.userid, classID];
    query = `SELECT * FROM (SELECT Projects.classID AS classID,
      Projects.projectID AS projectID,
      Projects.title AS title,
      Projects.status AS status,
      Projects.studentID AS studentID,
      Projects.name AS name,
      Projects.updated_date AS updated_date,
      professor.professorID AS professorID
      FROM
        (SELECT Professor.professorID AS professorID,
        Classroom.classID AS classID 
        FROM Professor, Classroom
        WHERE Professor.professorID = Classroom.professorID) AS professor,
        (SELECT Project.projectID AS projectID,
         Project.title AS title,
         Project.status AS status,
         Project.updated_date AS updated_date,
         Class_Student.classID AS classID,
         Class_Student.studentID AS studentID,
         Class_Student.name AS name 
         FROM
           (SELECT Class_Student.projectID AS projectID,
           Class_Student.classID AS classID,
           Student.studentID AS studentID,
           Student.name AS name 
           FROM Class_Student, Student
           WHERE Class_Student.studentID = Student.studentID
            ) AS Class_Student, Project
          WHERE Class_Student.projectID = Project.projectID) AS Projects
        WHERE Projects.classID = professor.classID) AS Project_Professor
      WHERE Project_Professor.professorID = ? AND Project_Professor.classID = ?`;
    db.query(query, params, (err, result) => {
      if (err) {
        return res.status(403).json({
          error: "Check Data",
          code: 3
        });
      } // if err
      console.log(loginInfo.name + ' 교수 ' + classID + ' 프로젝트 조회');
      return res.json({ result: result });
    });

  } else if (loginInfo.type == 'student') {
    // 학생일 시
    // 수업 내 프로젝트 조회
    let params = [classID, loginInfo.userid];
    query = `SELECT * FROM Project WHERE projectID = (
      SELECT projectID FROM Class_Student WHERE classID = ? AND studentID = ?);`;
    db.query(query, params, (err, result) => {
      if (err) {
        return res.status(403).json({
          error: "Check Data",
          code: 3
        });
      } // if err
      console.log(loginInfo.name + ' 학생 프로젝트 조회: ');
      console.log(result[0]);
      return res.json({ result: result });
    });

  } else {
    // 로그인을 안했을 시
    return res.status(401).json({
      error: "User is undefined",
      code: 2
    });
  }
});

/* 프로젝트 신청 */
router.post('/', (req, res) => {
  let loginInfo = req.session.loginInfo;

  let classID = req.body.classID;
  let title = req.body.title;
  let student = req.body.student;
  let projectID = new Date().toLocaleString();
  let status = 'standby';

  // 데이터 누락 시
  if (classID == '' || title == '' || student.length == 0) {
    return res.status(400).json({
      error: "Empty data",
      code: 1
    });
  }

  // 학생이 아닐 시
  if (loginInfo.type != 'student') {
    return res.status(403).json({
      error: "Forbidden",
      code: 2
    });
  }

  // 학생 목록에 본인이 없을 시
  if (student.indexOf(loginInfo.userid) < 0) {
    return res.status(403).json({
      error: "Forbidden",
      code: 2
    });
  }

  let query = '';

  // 수업 내 학생 검색
  query = 'SELECT * FROM Class_Student WHERE classID = ? AND studentID IN (?)';
  db.query(query, [classID, student], (err, result) => {
    if (err) {
      return res.status(403).json({
        error: "Check Data",
        code: 3
      });
    } // if err

    // 수업 외 학생이 포함되었을 시
    if (result.length != student.length) {
      return res.status(403).json({
        error: "Forbidden Student",
        code: 2
      });
    }

    // 이미 프로젝트에 참여중인 학생이 있을 시
    for (let i in result) {
      console.log(result[i].projectID != null);
      if (result[i].projectID != null) {
        return res.status(409).json({
          error: "Project Exists",
          code: 3
        });
      }
    }

    // 프로젝트 추가: standy 상태
    query = 'INSERT INTO Project (projectID, title, status, leader, updated_date) VALUES (?, ?, "standby", ?, ?)';
    db.query(query, [projectID, title, loginInfo.userid, projectID], (err) => {
      if (err) {
        return res.status(403).json({
          error: "Check Data",
          code: 3
        });
      } // if err

      // Class_Student 관계 추가
      query = 'UPDATE Class_Student SET projectID = ? WHERE classID = ? AND studentID IN (?)';
      db.query(query, [projectID, classID, student], (err, result) => {
        if (err) {
          return res.status(403).json({
            error: "Check Data",
            code: 3
          });
        } // if err
        console.log('프로젝트 신청 완료');

        query = 'SELECT title, professorID FROM Classroom WHERE classID = ?';
        db.query(query, classID, (err, result) => {
          if (err) {
            return res.status(403).json({
              error: "Check Data",
              code: 3
            });
          } // if err

          let classTitle = result[0].title;
          let professorID = result[0].professorID;
          let messageID = new Date().toLocaleString();

          query = 'INSERT INTO Message (receive_date, userID, type, classID, projectID, isCheck, classTitle) VALUES (?, ?, ?, ?, ?, ?, ?)';
          // PA = project apply
          let data = [messageID, professorID, 'PA', classID, projectID, false, classTitle];
          db.query(query, data, (err) => {
            if (err) {
              return res.status(403).json({
                error: "Check Data",
                code: 3
              });
            } // if err
            console.log('insert into message');
            return res.json({ result: 'success' });
          }); // insert into Message
        }); // SELECT professorID
      }); // update Class_Student
    }); // insert into project
  }); // SELECT student in class

});

/* 프로젝트 승인 */
router.put('/', (req, res) => {
  let loginInfo = req.session.loginInfo;
  let projectID = req.body.projectID;
  let status = req.body.status;

  // 교수가 아닐 시
  if (loginInfo.type != 'professor') {
    return res.status(403).json({
      error: "Forbidden",
      code: 1
    });
  }

  let query = '';
  if (status === "start") {
    // 프로젝트 학생 검색
    query = 'SELECT * FROM Class_Student WHERE projectID = ?';
    console.log(projectID);
    db.query(query, projectID, (err, result) => {
      if (err) {
        return res.status(403).json({
          error: "Check Data",
          code: 3
        });
      } // if err

      if (result.length == 0) {
        return res.status(401).json({
          error: "Empty Data",
          code: 2
        });
      }

      let studentList = [];
      for (let i in result) studentList.push(result[i].studentID);
      console.log(studentList);

      // 교수 메시지 읽음으로 표시
      query = 'UPDATE Message SET isCheck = ? WHERE projectID = ? AND userID = ?';
      db.query(query, [true, projectID, loginInfo.userid], (err) => {
        if (err) {
          return res.status(403).json({
            error: "Check Data",
            code: 3
          });
        } // if err
        console.log('updated professor message');


        query = `SELECT Classroom.professorID, Classroom.title, Classroom.classID 
          FROM Classroom, (SELECT DISTINCT Class_Student.classID
            FROM Class_Student, Project
            WHERE Class_Student.projectID = Project.projectID) AS tttt
          WHERE Classroom.classID = tttt.classID
          AND Classroom.professorID = ?`;

        db.query(query, loginInfo.userid, (err, result) => {
          if (err) {
            return res.status(403).json({
              error: "Check Data",
              code: 3
            });
          } // if err

          // 학생에게 승인 메시지 추가
          query = 'INSERT INTO Message (receive_date, userID, type, classID, projectID, isCheck, classTitle) VALUES ';
          for (let i in studentList) {
            if (i == 0) {
              query += `("${ new Date().toLocaleString() }", "${ studentList[i] }", "PAS", "${ result[0].classID }","${ projectID }", false, "${ result[0].title }")`;
            } else {
              query += `, ("${ new Date().toLocaleString() }", "${ studentList[i] }", "PAS", "${ result[0].classID }","${ projectID }", false, "${ result[0].title }")`;
            }
          }
          db.query(query, (err) => {
            if (err) {
              return res.status(403).json({
                error: "Check Data",
                code: 3
              });
            } // if err

            // 프로젝트 승인
            query = 'UPDATE Project SET status="start" WHERE projectID = ?';
            db.query(query, projectID, (err, result) => {
              if (err) {
                return res.status(403).json({
                  error: "Check Data",
                  code: 3
                });
              } // if err
              console.log('프로젝트 승인 완료');
              return res.send({ result: true });
            }); // 프로젝트 승인
          })
        }); // 학생 메시지 추가
      }); // 교수 메시지 읽음 표시
    }); // 프로젝트 학생 검색

  } else { // 프로젝트 거절(삭제)
    query = 'DELETE FROM Project WHERE projectID = ?'
    db.query(query, projectID, (err, result) => {
      if (err) {
        return res.status(403).json({
          error: "Check Data",
          code: 3
        });
      } // if err
      console.log('프로젝트 삭제 완료: ' + projectID);

      // 교수 메시지 읽음으로 표시
      query = 'UPDATE Message SET isCheck = ? WHERE projectID = ? AND userID = ?';
      db.query(query, [true, projectID, loginInfo.userid], (err) => {
        if (err) {
          return res.status(403).json({
            error: "Check Data",
            code: 3
          });
        } // if err
        console.log('updated professor message');

        return res.send({ result: true });
      });
    });
  }
});

/* 승인 대기 목록 확인 - 교수용 */
router.get('/getStandbyProject', (req, res) => {
  let loginInfo = req.session.loginInfo;
  let classID = req.query.classID;

  // 교수가 아닐 시
  if (loginInfo.type != 'professor') {
    return res.status(403).json({
      error: "Forbidden",
      code: 1
    });
  }

  // classID 의 값이 없을 시
  if (classID == null) {
    return res.status(400).json({
      error: "Empty classID",
      code: 2
    });
  }

  // standby project 검색
  let query = `SELECT * FROM Class_Student JOIN (
    SELECT * FROM Project WHERE status = 'standby') AS Project 
    ON Project.projectID = Class_Student.projectID
    WHERE classID = ?`;
  db.query(query, classID, (err, result) => {
    if (err) {
      return res.status(403).json({
        error: "Check Data",
        code: 3
      });
    } // if err

    console.log('승인 대기 목록 조회 완료');
    return res.json({ result: result });
  });

});

export default router;