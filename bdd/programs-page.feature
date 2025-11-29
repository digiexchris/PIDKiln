Feature: Programs Page
  As a user managing firing programs
  I want to view, edit, and manage my programs
  So that I can create and modify firing schedules

  Background:
    Given the PIDKiln frontend is loaded in a browser
    And the WebSocket is connected
    And I am on the Programs view

  @programs @list
  Scenario: View list of programs
    Then I should see a table of available programs
    And each program row should show:
      | column      | description                    |
      | Name        | Program filename               |
      | Size        | File size in bytes             |
    And each program row should have Load, Preview, Edit, and Delete buttons

  @programs @preview
  Scenario: Preview a program
    When I click the "Preview" button for "program1.json"
    Then a description row should appear below the program row
    And a chart row should appear below the description row
    And the chart should display the temperature profile
    And the chart X-axis should show time in HH:MM format
    And the chart Y-axis should show temperature in °C

  @programs @preview @toggle
  Scenario: Toggle preview off
    Given the preview for "program1.json" is open
    When I click the "Preview" button for "program1.json" again
    Then the description row should be hidden
    And the chart row should be hidden

  @programs @preview @time-anchor
  Scenario: Preview chart time anchored to current time
    When I click the "Preview" button for "program1.json"
    Then the chart X-axis should start at the current time
    And subsequent time labels should be offset from current time

  @programs @edit
  Scenario: Edit a program
    When I click the "Edit" button for "program1.json"
    Then I should be navigated to the Editor view
    And the editor should display the program content
    And the filename should be shown in the toolbar

  @programs @delete
  Scenario: Delete a program
    When I click the "Delete" button for "program1.json"
    Then a confirmation dialog should appear
    When I confirm the deletion
    Then "program1.json" should be removed from the list

  @programs @delete @cancel
  Scenario: Cancel program deletion
    When I click the "Delete" button for "program1.json"
    And I cancel the confirmation dialog
    Then "program1.json" should still be in the list

  @programs @create
  Scenario: Create a new program
    When I click the "New Program" button
    Then a prompt should ask for the program filename
    When I enter "my_program.json" as the filename
    Then I should be navigated to the Editor view
    And the editor should contain a template JSON structure

