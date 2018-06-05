import React from 'react';
import { Switch, Route, withRouter } from 'react-router-dom';
import { connect } from 'react-redux';

import Notice from '../containers/Notice';
import ProjectList from '../containers/ProjectList';
import Approve from '../containers/Approve';
import Status from '../containers/Status';
import Project from '../containers/Project';
import NotFound from '../containers/NotFound';

import Searchbar from './../components/Searchbar';
import Sidebar from '../components/Sidebar';

import { Layout, message } from 'antd';
const { Content, Sider } = Layout;

class Classroom extends React.Component {

  constructor(props) {
    super(props);
  }

  componentDidMount() {

  }


  render() {
    return (
      <Layout>
        {/* Left Sidebar - Width: 256 */ }
        <Sidebar />

        {/* Right Side Content Body */ }
        <Layout className='layout-body' style={ { padding: '0 0 16px' } }>

          <Searchbar />

          <Content style={ { minHeight: 768, margin: '12px 16px 0', overflow: 'initial' } }>
            <Switch>
              <Route exact path="/classroom/:id" component={ Notice } />
              <Route path="/classroom/:id/notice" component={ Notice } />
              <Route path="/classroom/:id/projectList" component={ ProjectList } />
              <Route path="/classroom/:id/approve" component={ Approve } />
              <Route path="/classroom/:id/status" component={ Status } />
              <Route path="/classroom/:id/kanbanboard" component={ Project } />
              <Route path="*" component={ NotFound } />
            </Switch>
          </Content>

        </Layout>
      </Layout>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    selectedClass: state.classroom.selectedClass.classInfo,
    getProject: state.project.get
  };
}

export default withRouter(connect(mapStateToProps)(Classroom));