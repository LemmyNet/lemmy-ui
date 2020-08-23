import "jsdom-global/register";
import { configure, mount, render, shallow } from "enzyme";
import InfernoEnzymeAdapter = require("enzyme-adapter-inferno");
import { should } from "fuse-test-runner";
import { Component } from "inferno";
import { renderToSnapshot } from "inferno-test-utils";
import About from "./About";
configure({ adapter: new InfernoEnzymeAdapter() });

export class AboutTest {
   public "Should be okay"() {
      const wrapper = mount(<About />);
      wrapper.find(".button").simulate("click");
      const countText = wrapper.find(".count").text();
      should(countText)
         .beString()
         .equal("1");
   }
}
