Feature: About Page
  As a user of the PIDKiln interface
  I want to view information about the application
  So that I can learn about the project and find resources

  Background:
    Given the PIDKiln frontend is loaded in a browser
    And I am on the About view

  @about @content
  Scenario: View about page content
    Then I should see the PIDKiln project name
    And I should see a brief description of the project
    And I should see links to project resources

  @about @version
  Scenario: Version information
    Then I should see the current firmware version

